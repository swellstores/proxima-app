import { handleMiddlewareRequest } from '@/utils/server';

export const postLogin = handleMiddlewareRequest(
  'POST',
  (path: string) => path.startsWith('/products/'),
  async (context: any) => {
    const { params, swell, theme, redirect } = context;

    // TODO
  },
);

/*

GET /products/something?variant_id=1812679817234

POST /products/something?options[0]=value&options[1]=value&section_id=product-grid

*/
