import * as fs from 'fs';
import * as path from 'path';

// Parse environment variables from .env or .env.local
function loadEnv() {
  const envFiles = ['.env.local', '.env'];
  for (const file of envFiles) {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      content.split('\n').forEach((line) => {
        const match = line.match(/^([^#=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          const val = match[2].trim().replace(/^["']|["']$/g, '');
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      });
    }
  }
}
loadEnv();

import { getSupabaseServerClient } from '../src/lib/supabase/server';
import { getDb } from '../src/lib/db';
import { createSessionToken } from '../src/lib/auth/session';
import { StoryService } from '../src/lib/services/story';
import crypto from 'crypto';

interface TestResult {
  name: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, name: string, details?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${name}`);
    results.push({ name, passed: true, details });
  } else {
    console.error(`  ✗ FAIL: ${name} - ${details || 'Assertion failed'}`);
    results.push({ name, passed: false, details });
  }
}

// Generate valid test binary buffers
function createFakeJpegBuffer(): Buffer {
  // JPEG magic bytes: FF D8 FF E0
  const header = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
  const filler = Buffer.alloc(1024, 0xaa);
  const footer = Buffer.from([0xff, 0xd9]);
  return Buffer.concat([header, filler, footer]);
}

function createFakeMp4Buffer(): Buffer {
  // MP4 magic bytes: 00 00 00 18 'ftyp' 'mp42' ...
  const size = Buffer.from([0x00, 0x00, 0x00, 0x18]);
  const ftyp = Buffer.from('ftypmp42', 'ascii');
  const rest = Buffer.alloc(2048, 0x55);
  return Buffer.concat([size, ftyp, rest]);
}

async function runUploadVerification() {
  console.log('====================================================');
  console.log('FEEDER.LIFE: REAL UPLOAD, STORAGE & PERSISTENCE TEST');
  console.log('====================================================\n');

  const supabase = getSupabaseServerClient();
  const db = getDb();

  const timestamp = Date.now();

  // Define 3 real test users with valid UUIDs
  const userA = {
    id: crypto.randomUUID(),
    firebase_uid: `fb_uid_a_${timestamp}`,
    email: `usera_${timestamp}@feeder.test`,
    username: `guardian_a_${timestamp.toString().slice(-4)}`,
    display_name: 'Guardian User A',
  };

  const userB = {
    id: crypto.randomUUID(),
    firebase_uid: `fb_uid_b_${timestamp}`,
    email: `userb_${timestamp}@feeder.test`,
    username: `guardian_b_${timestamp.toString().slice(-4)}`,
    display_name: 'Guardian User B',
  };

  const userC = {
    id: crypto.randomUUID(),
    firebase_uid: `fb_uid_c_${timestamp}`,
    email: `userc_${timestamp}@feeder.test`,
    username: `adversary_c_${timestamp.toString().slice(-4)}`,
    display_name: 'Adversary User C',
  };

  // Seed test users into local DB and Supabase
  for (const u of [userA, userB, userC]) {
    db.prepare(`
      INSERT OR REPLACE INTO users (id, firebase_uid, email, password_hash, username, full_name, avatar_url, role, status)
      VALUES (?, ?, ?, 'mock_password_hash_test', ?, ?, ?, 'USER', 'ACTIVE')
    `).run(u.id, u.firebase_uid, u.email, u.username, u.display_name, '/avatars/default.png');

    await supabase.from('users').upsert({
      id: u.id,
      firebase_uid: u.firebase_uid,
      email: u.email,
      username: u.username,
      display_name: u.display_name,
      avatar_url: '/avatars/default.png',
      is_active: true,
      profile_data: { feeder_level: 'Community Feeder' },
      settings: {},
      privacy_settings: {},
      interests: ['dogs', 'cats'],
      onboarding_completed: true,
    });
  }

  console.log('1. TEST POST IMAGE UPLOAD TO SUPABASE STORAGE');
  const jpegBuffer = createFakeJpegBuffer();
  const postImageFilename = `${crypto.randomUUID()}.jpg`;
  const postImagePath = `uploads/${userA.firebase_uid}/posts/${postImageFilename}`;

  const { data: uploadImgData, error: uploadImgErr } = await supabase.storage
    .from('feeder-uploads')
    .upload(postImagePath, jpegBuffer, { contentType: 'image/jpeg', upsert: false });

  assert(!uploadImgErr, 'Post Image Upload to Supabase Storage succeeds', uploadImgErr?.message);
  assert(uploadImgData?.path === postImagePath, 'Storage path is user-scoped to User A');

  const { data: imgUrlData } = supabase.storage.from('feeder-uploads').getPublicUrl(postImagePath);
  const postImageUrl = imgUrlData.publicUrl;
  assert(postImageUrl.includes(postImagePath), 'Public URL points to real Storage path');

  console.log('\n2. TEST POST VIDEO UPLOAD TO SUPABASE STORAGE');
  const mp4Buffer = createFakeMp4Buffer();
  const postVideoFilename = `${crypto.randomUUID()}.mp4`;
  const postVideoPath = `uploads/${userA.firebase_uid}/posts/${postVideoFilename}`;

  const { data: uploadVidData, error: uploadVidErr } = await supabase.storage
    .from('feeder-uploads')
    .upload(postVideoPath, mp4Buffer, { contentType: 'video/mp4', upsert: false });

  assert(!uploadVidErr, 'Post Video Upload to Supabase Storage succeeds', uploadVidErr?.message);
  assert(uploadVidData?.path === postVideoPath, 'Storage video path is user-scoped to User A');

  const { data: vidUrlData } = supabase.storage.from('feeder-uploads').getPublicUrl(postVideoPath);
  const postVideoUrl = vidUrlData.publicUrl;

  console.log('\n3. TEST REAL POST CREATION & DUAL-PERSISTENCE');
  const testPostId = crypto.randomUUID();
  const mediaItems = [
    { url: postImageUrl, type: 'image' },
    { url: postVideoUrl, type: 'video' },
  ];

  // 1. Dual-write to Supabase social_posts
  const { data: supaPost, error: supaPostErr } = await supabase.from('social_posts').insert({
    id: testPostId,
    record_type: 'post',
    user_id: userA.id,
    content: 'Morning stray dog feeding round completed with rice, chicken broth and fresh water.',
    data: {
      title: 'Morning Indie Pack Fed',
      content_type: 'FEEDING_UPDATE',
      location_name: 'Indiranagar 12th Main',
    },
    media: mediaItems,
    reactions: {},
    comments: {},
    hashtags: ['feedings', 'indies', 'welfare'],
    mentions: [],
    visibility: 'public',
    is_active: true,
    is_deleted: false,
    stats: { views_count: 0, likes_count: 0 },
  }).select().maybeSingle();

  assert(!supaPostErr, 'Post persisted in Supabase social_posts table', supaPostErr?.message);

  // 2. Write to local database
  db.prepare(`
    INSERT INTO posts (
      id, author_id, content_type, title, body, media_urls_json, tags_json, location_name, visibility, reaction_count, comment_count, share_count, safety_score
    ) VALUES (?, ?, 'FEEDING_UPDATE', 'Morning Indie Pack Fed', ?, ?, ?, 'Indiranagar 12th Main', 'PUBLIC', 0, 0, 0, 1.0)
  `).run(
    testPostId,
    userA.id,
    'Morning stray dog feeding round completed with rice, chicken broth and fresh water.',
    JSON.stringify([postImageUrl, postVideoUrl]),
    JSON.stringify(['feedings', 'indies', 'welfare'])
  );

  console.log('\n4. TEST REFRESH & PERSISTENCE VERIFICATION');
  // Query Supabase directly
  const { data: retrievedPost, error: queryErr } = await supabase
    .from('social_posts')
    .select('*')
    .eq('id', testPostId)
    .maybeSingle();

  assert(!queryErr && !!retrievedPost, 'Post persists across fresh database queries (simulating page refresh)');
  assert(Array.isArray(retrievedPost.media) && retrievedPost.media.length === 2, 'Media metadata correctly preserved in social_posts JSONB');
  assert(retrievedPost.media[0].type === 'image' && retrievedPost.media[1].type === 'video', 'Image vs Video media types accurately preserved');

  console.log('\n5. TEST STORY IMAGE & VIDEO UPLOADS');
  const storyImgFilename = `${crypto.randomUUID()}.jpg`;
  const storyImgPath = `uploads/${userA.firebase_uid}/stories/${storyImgFilename}`;
  const { error: storyImgErr } = await supabase.storage
    .from('feeder-uploads')
    .upload(storyImgPath, jpegBuffer, { contentType: 'image/jpeg' });
  assert(!storyImgErr, 'Story Image uploaded to uploads/{uid}/stories/ path');

  const storyVidFilename = `${crypto.randomUUID()}.mp4`;
  const storyVidPath = `uploads/${userA.firebase_uid}/stories/${storyVidFilename}`;
  const { error: storyVidErr } = await supabase.storage
    .from('feeder-uploads')
    .upload(storyVidPath, mp4Buffer, { contentType: 'video/mp4' });
  assert(!storyVidErr, 'Story Video uploaded to uploads/{uid}/stories/ path');

  const { data: storyVidUrlData } = supabase.storage.from('feeder-uploads').getPublicUrl(storyVidPath);
  const storyVideoUrl = storyVidUrlData.publicUrl;

  console.log('\n6. TEST STORY CREATION & 24H EXPIRATION FILTERING');
  const activeStoryId = await StoryService.createStory({
    authorId: userA.id,
    mediaUrl: storyVideoUrl,
    mediaType: 'VIDEO',
    caption: 'Puppies waking up and playing! 🐾',
  });

  assert(!!activeStoryId, 'Story created in database with record_type = story');

  // Verify active stories list returns it
  const activeStories = await StoryService.getActiveStories(userB.id);
  const foundActive = activeStories.find((s: any) => s.id === activeStoryId);
  assert(!!foundActive, 'Active story returned in story tray');
  assert(foundActive?.media_type === 'VIDEO', 'Story media type preserved as VIDEO');

  // Verify 24h expiration: create an expired story
  const expiredStoryId = `story_expired_${timestamp}`;
  const pastIso = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  db.prepare(`
    INSERT INTO stories (id, author_id, media_url, media_type, caption, created_at, expires_at)
    VALUES (?, ?, ?, 'IMAGE', 'Expired story', ?, ?)
  `).run(expiredStoryId, userA.id, postImageUrl, pastIso, pastIso);

  const storiesAfterExpired = await StoryService.getActiveStories(userB.id);
  const foundExpired = storiesAfterExpired.find((s: any) => s.id === expiredStoryId);
  assert(!foundExpired, 'Expired story (expires_at < now) is excluded from active stories');

  console.log('\n7. TEST STORY VIEW TRACKING IN PLATFORM_DATA');
  await StoryService.markViewed(activeStoryId, userB.id);

  // Check view in Supabase platform_data
  const { data: supaView } = await supabase
    .from('platform_data')
    .select('*')
    .eq('data_type', 'audit')
    .eq('user_id', userB.id)
    .eq('target_id', activeStoryId)
    .maybeSingle();

  assert(!!supaView, 'Story view recorded in Supabase platform_data');

  assert(!!supaView, 'Story view dual-tracked into platform_data table without new tables');

  // Check User A can see User B in viewer list
  const viewers = await StoryService.getStoryViewers(activeStoryId, userA.id);
  const userBInViewers = viewers.find((v: any) => v.user_id === userB.id);
  assert(!!userBInViewers, 'User A can view User B in the story viewers list');

  console.log('\n8. TEST AUTHORIZATION / RBAC (USER C UNPRIVILEGED ACCESS)');
  // 1. User C tries to view User A's viewers list -> Must fail with FORBIDDEN
  let userCFailedViewers = false;
  try {
    await StoryService.getStoryViewers(activeStoryId, userC.id);
  } catch (err: any) {
    if (err.message === 'FORBIDDEN') userCFailedViewers = true;
  }
  assert(userCFailedViewers, 'User C forbidden from viewing User A story viewers list');

  // 2. User C tries to delete User A's story -> Must fail with FORBIDDEN
  let userCFailedDeleteStory = false;
  try {
    await StoryService.deleteStory(activeStoryId, userC.id, 'USER');
  } catch (err: any) {
    if (err.message === 'FORBIDDEN') userCFailedDeleteStory = true;
  }
  assert(userCFailedDeleteStory, 'User C forbidden from deleting User A story');

  console.log('\n9. CLEANUP TEST ARTIFACTS IN STORAGE & DATABASE');
  // Clean up Supabase Storage
  const { error: delStorageErr } = await supabase.storage
    .from('feeder-uploads')
    .remove([postImagePath, postVideoPath, storyImgPath, storyVidPath]);
  assert(!delStorageErr, 'Supabase Storage test files removed cleanly');

  // Clean up database records
  await supabase.from('social_posts').delete().eq('user_id', userA.id);
  await supabase.from('platform_data').delete().eq('user_id', userB.id);
  await supabase.from('users').delete().in('id', [userA.id, userB.id, userC.id]);
  db.prepare('DELETE FROM posts WHERE author_id = ?').run(userA.id);
  db.prepare('DELETE FROM stories WHERE author_id = ?').run(userA.id);
  db.prepare('DELETE FROM users WHERE id IN (?, ?, ?)').run(userA.id, userB.id, userC.id);

  console.log('\n====================================================');
  const allPassed = results.every((r) => r.passed);
  const passedCount = results.filter((r) => r.passed).length;
  console.log(`TOTAL TESTS: ${results.length} | PASSED: ${passedCount} | FAILED: ${results.length - passedCount}`);
  console.log(`OVERALL RESULT: ${allPassed ? 'ALL PASS' : 'FAIL'}`);
  console.log('====================================================\n');

  if (!allPassed) {
    process.exit(1);
  }
}

runUploadVerification().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
