import {
  Swell,
  SwellData,
  SwellStorefrontRecord,
  SwellStorefrontCollection,
} from '@swell/apps-sdk';

export class BlogResource extends SwellStorefrontRecord {
  constructor(
    swell: Swell,
    blogSlug: string,
    categorySlug?: string,
    query: SwellData = {},
  ) {
    super(swell, 'content/blogs', blogSlug, query, async () => {
      const category = categorySlug
        ? new SwellStorefrontRecord(
            swell,
            'content/blog-categories',
            categorySlug,
          )
        : null;

      if (category) {
        await category.id;
      }

      const blog = new SwellStorefrontRecord(
        swell,
        'content/blogs',
        blogSlug,
        query,
      );

      if (blog) {
        await blog.id;
      }

      return {
        id: blog?.id ?? blogSlug,
        ...(blog?.id ? blog._result : undefined),
        category,
      };
    });
  }
}

export class BlogCategoryResource extends SwellStorefrontRecord {
  constructor(swell: Swell, slug: string, query: SwellData = {}) {
    super(swell, 'content/blog-categories', slug, query, async () => {
      const category = new SwellStorefrontRecord(
        swell,
        'content/blog-categories',
        slug,
        query,
      );

      const categoryId = await category.id;

      const blogs = categoryId
        ? new SwellStorefrontCollection(swell, 'content/blogs', {
            category_id: categoryId,
          })
        : null;

      return {
        id: category.id ?? slug,
        ...(category.id ? category._result : undefined),
        blogs,
      };
    });
  }
}
