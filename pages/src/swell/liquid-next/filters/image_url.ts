import { LiquidSwell } from '..';
import { paramsToProps } from '../utils';

// {{ product | image_url: width: 450 }}

export default function bind(_liquidSwell: LiquidSwell) {
  return (imageField: any, params: any[]) => {
    const image =
      imageField?.images?.[0] ||
      imageField?.image ||
      imageField?.preview_image || // Shopify specific
      imageField;
    
    const imageUrl = String(
      image?.url ||
        image?.file?.url ||
        image?.src?.url || // Shopify specific
        image,
    );

    const props = paramsToProps(params);

    const query = [
      props?.width && `width=${props.width * 2}`,
      props?.height && `height=${props.height * 2}`,
    ]
      .filter(Boolean)
      .join('&');

    return `${imageUrl}${query ? `?${query}` : ''}`;
  };
}
