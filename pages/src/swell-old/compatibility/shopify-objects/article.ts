import { ShopifyResource, defer } from './resource';
import ShopifyImage from './image';

export default function ShopifyArticle(
  instance: ShopifyCompatibility,
  blog: StorefrontResource | SwellRecord,
  blogCategory?: StorefrontResource | SwellRecord,
) {
  if (blog instanceof ShopifyResource) {
    return blog.clone();
  }

  if (blogCategory) {
    blog.category = blogCategory;
  }

  return new ShopifyResource({
    author: defer(async () => (await blog.author)?.name || blog.author?.email),
    content: defer(() => blog.content),
    created_at: defer(() => blog.date_created),
    excerpt: defer(() => blog.summary),
    excerpt_or_content: defer(() => blog.summary || blog.content),
    handle: defer(() => blog.slug),
    id: defer(() => blog.id),
    image: defer(async () => {
      const image = await blog.image;
      console.log('blog before image load', image);
      return image && ShopifyImage(instance, image);
    }),
    metafields: null,
    published_at: defer(
      async () => (await blog.date_published) || blog.date_created,
    ),
    tags: defer(() => blog.tags),
    template_suffix: null, // TODO
    title: defer(() => blog.title),
    updated_at: defer(
      async () => (await blog.date_updated) || blog.date_created,
    ),
    url: defer(
      async () =>
        (await blog.category?.slug) &&
        `/blogs/${blog.category?.slug}/${blog.slug}`,
    ),
    user: defer(() => blog.author),

    // Comments not supported
    comment_post_url: null,
    comments: null,
    comments_count: null,
    comments_enabled: false,
    moderated: false,
  });
}
