import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

async function searchNews(query: string, limit: number = 6) {
  try {
    const encoded = encodeURIComponent(query);
    const rssUrl = `https://news.google.com/rss/search?q=${encoded}&hl=en-US&gl=US&ceid=US:en`;
    const res = await fetch(rssUrl, {
      headers: { 'User-Agent': 'FeederLifeApp/1.0 (contact@feeder.life)' },
      next: { revalidate: 300 }, // 5 min cache
    });
    if (!res.ok) return [];

    const xml = await res.text();
    const items: any[] = [];
    const itemRegex = /<item>[\s\S]*?<\/item>/gi;
    const matches = xml.match(itemRegex) || [];

    for (const itemXml of matches.slice(0, limit)) {
      const titleMatch = itemXml.match(/<title>([\s\S]*?)<\/title>/i);
      const linkMatch = itemXml.match(/<link>([\s\S]*?)<\/link>/i);
      const pubDateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);
      const sourceMatch = itemXml.match(/<source[^>]*>([\s\S]*?)<\/source>/i);
      const descMatch = itemXml.match(/<description>([\s\S]*?)<\/description>/i);

      let rawTitle = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/gi, '$1').trim() : '';
      let source = sourceMatch ? sourceMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/gi, '$1').trim() : '';

      if (!source && rawTitle.includes(' - ')) {
        const parts = rawTitle.split(' - ');
        source = parts.pop() || '';
        rawTitle = parts.join(' - ');
      }

      const url = linkMatch ? linkMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/gi, '$1').trim() : '';
      const publishedAt = pubDateMatch ? new Date(pubDateMatch[1]).toISOString() : new Date().toISOString();

      let snippet = descMatch
        ? descMatch[1]
            .replace(/<[^>]+>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, '&')
            .replace(/<!\[CDATA\[(.*?)\]\]>/gi, '$1')
            .trim()
        : '';
      if (snippet.length > 180) {
        snippet = snippet.slice(0, 180) + '...';
      }

      if (rawTitle && url) {
        items.push({
          id: Buffer.from(url).toString('base64').slice(0, 16),
          title: rawTitle,
          source: source || 'News Source',
          url,
          snippet,
          published_at: publishedAt,
        });
      }
    }
    return items;
  } catch {
    return [];
  }
}

async function searchImages(query: string, limit: number = 8) {
  try {
    const encoded = encodeURIComponent(query);
    const apiUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encoded}&gsrnamespace=6&gsrlimit=${limit * 2}&prop=imageinfo&iiprop=url|size|mime|extmetadata&format=json`;

    const res = await fetch(apiUrl, {
      headers: { 'User-Agent': 'FeederLifeApp/1.0 (contact@feeder.life)' },
      next: { revalidate: 3600 }, // 1 hour cache
    });
    if (!res.ok) return [];

    const data = await res.json();
    const pages = data.query?.pages || {};
    const images: any[] = [];

    for (const pageId of Object.keys(pages)) {
      const page = pages[pageId];
      const imageInfo = page.imageinfo?.[0];
      if (!imageInfo || !imageInfo.url) continue;

      const mime = imageInfo.mime || '';
      if (!mime.startsWith('image/') || mime.includes('svg') || mime.includes('tiff')) continue;

      const metadata = imageInfo.extmetadata || {};
      let title = page.title || 'Photo';
      title = title.replace(/^File:/i, '').replace(/\.[a-zA-Z0-9]+$/, '').replace(/_/g, ' ');

      const author =
        metadata.Artist?.value?.replace(/<[^>]+>/g, '').trim() ||
        metadata.Credit?.value?.replace(/<[^>]+>/g, '').trim() ||
        'Wikimedia Contributor';
      const license = metadata.LicenseShortName?.value || 'Creative Commons';

      images.push({
        id: String(page.pageid || Math.random()),
        title,
        url: imageInfo.url,
        thumbnail_url: imageInfo.thumburl || imageInfo.url,
        author: author.slice(0, 40),
        license,
        source_url: imageInfo.descriptionurl || imageInfo.url,
        width: imageInfo.width || 800,
        height: imageInfo.height || 600,
      });

      if (images.length >= limit) break;
    }

    return images;
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const rawQuery = (searchParams.get('q') || '').trim();
    const type = (searchParams.get('type') || 'all').toLowerCase();

    // Sanitize query to prevent PostgREST syntax errors with special chars
    const sanitized = rawQuery.replace(/[%_,()"]/g, ' ').replace(/\s+/g, ' ').trim();

    if (!sanitized) {
      return NextResponse.json({
        success: true,
        query: rawQuery,
        type,
        results: { people: [], communities: [], posts: [], news: [], images: [] },
      });
    }

    const supabase = getSupabaseServerClient();

    let people: any[] = [];
    let communities: any[] = [];
    let posts: any[] = [];
    let news: any[] = [];
    let images: any[] = [];

    const fetchAll = type === 'all';
    const fetchPeople = fetchAll || type === 'people';
    const fetchCommunities = fetchAll || type === 'communities';
    const fetchPosts = fetchAll || type === 'posts';
    const fetchNews = fetchAll || type === 'news';
    const fetchImages = fetchAll || type === 'images';

    const dbLimit = fetchAll ? 6 : 16;
    const extLimit = fetchAll ? 6 : 16;

    // 1. Search Real Users (public profile fields only)
    if (fetchPeople) {
      const { data: userRows } = await supabase
        .from('users')
        .select('id, username, display_name, avatar_url, city, is_verified, profile_data')
        .eq('is_active', true)
        .or(`display_name.ilike.%${sanitized}%,username.ilike.%${sanitized}%`)
        .limit(dbLimit);

      people = (userRows || [])
        .filter((u: any) => u.username)
        .map((u: any) => ({
          id: u.id,
          username: u.username,
          full_name: u.display_name || u.username,
          avatar_url: u.avatar_url || null,
          area_name: u.city || u.profile_data?.city || '',
          is_verified: !!u.is_verified,
          feeder_level: u.profile_data?.feeder_level || 'Animal Guardian',
        }));
    }

    // 2. Search Real Communities
    if (fetchCommunities) {
      const { data: commRows } = await supabase
        .from('communities')
        .select('id, name, slug, description, community_type, city, avatar_url, members, stats')
        .eq('is_active', true)
        .or(`name.ilike.%${sanitized}%,description.ilike.%${sanitized}%`)
        .limit(dbLimit);

      communities = (commRows || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description || '',
        category: c.community_type || 'COMMUNITY',
        location_area: c.city || '',
        avatar_image: c.avatar_url,
        member_count: Array.isArray(c.members) ? c.members.length : c.stats?.members_count || 1,
      }));
    }

    // 3. Search Real Posts
    if (fetchPosts) {
      const { data: postRows } = await supabase
        .from('social_posts')
        .select('id, user_id, content, data, stats, created_at')
        .eq('record_type', 'post')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .ilike('content', `%${sanitized}%`)
        .order('created_at', { ascending: false })
        .limit(dbLimit);

      if (postRows && postRows.length > 0) {
        const userIds = Array.from(new Set(postRows.map((p) => p.user_id).filter(Boolean)));
        const { data: authors } = await supabase
          .from('users')
          .select('id, username, display_name, avatar_url')
          .in('id', userIds);

        const authorMap = new Map((authors || []).map((a: any) => [a.id, a]));

        posts = postRows.map((p: any) => {
          const author = authorMap.get(p.user_id);
          return {
            id: p.id,
            title: p.data?.title || '',
            body: p.content || '',
            content_type: p.data?.content_type || 'GENERAL',
            media_url: p.data?.media_url || p.data?.images?.[0] || null,
            location_name: p.data?.location_name || '',
            reaction_count: p.stats?.likes_count || 0,
            comment_count: p.stats?.comments_count || 0,
            author_name: author?.display_name || author?.username || 'Animal Guardian',
            author_username: author?.username || '',
            author_avatar: author?.avatar_url || '',
            created_at: p.created_at,
          };
        });
      }
    }

    // 4. Search Real News (Google News RSS server-side integration)
    if (fetchNews) {
      news = await searchNews(sanitized, extLimit);
    }

    // 5. Search Real Images (Wikimedia Commons authentic media)
    if (fetchImages) {
      images = await searchImages(sanitized, extLimit);
    }

    return NextResponse.json({
      success: true,
      query: rawQuery,
      type,
      results: { people, communities, posts, news, images },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
