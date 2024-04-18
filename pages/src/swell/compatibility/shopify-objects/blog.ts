import { ShopifyResource, defer } from './resource';
import ShopifyArticle from './article';

export default function ShopifyBlog(
  instance: ShopifyCompatibility,
  blogCategory: StorefrontResource | SwellRecord,
) {
  if (blogCategory instanceof ShopifyResource) {
    return blogCategory.clone();
  }

  const allTags = defer(async () => {
    const blogs = await blogCategory.blogs;
    return blogs?.results.reduce((acc: string[], blog: any) => {
      for (const tag of blog.tags || []) {
        if (!acc.includes(tag)) {
          acc.push(tag);
        }
      }
      return acc;
    }, []);
  });

  return new ShopifyResource({
    all_tags: allTags,
    articles: defer(
      async () =>
        blogCategory.blogs &&
        ((await blogCategory.blogs.results)?.map((blog: any) =>
          ShopifyArticle(instance, blog, blogCategory),
        ) ||
          []),
    ),
    articles_count: defer(
      async () => (blogCategory.blogs && (await blogCategory.blogs).count) || 0,
    ),
    handle: defer(() => blogCategory.slug),
    id: defer(() => blogCategory.id),
    metafields: null,
    next_article: null, // TODO
    previous_article: null, // TODO
    tags: allTags, // TODO: this should only apply to articles in the current view
    template_suffix: null, // TODO
    title: defer(() => blogCategory.title),
    url: defer(
      async () => (await blogCategory.slug) && `/blogs/${blogCategory.slug}`,
    ),

    // Not supported
    comments_enabled: false,
    moderated: false,
  });
}
