import { LiquidSwell } from '..';
import { paramsToProps } from '../utils';

// {{ product | image_url | image_tag }}
// TODO: focal point

export default function bind(_liquidSwell: LiquidSwell) {
  return (imageUrl: string, params: any[]) => {
    let {
      width,
      height,
      widths,
      srcset,
      preload,
      alt,
      loading = 'lazy',
      ...attrs
    } = paramsToProps(params);

    if (width === undefined) {
      width = getSizeFromUrlQuery(imageUrl, 'width');
    }
    if (height === undefined) {
      height = getSizeFromUrlQuery(imageUrl, 'height');
    }
    if (widths === undefined) {
      widths = generateSmartWidths(width);
    }
    if (srcset === undefined) {
      srcset = generateSmartSrcset(imageUrl, widths);
    }
    if (loading === null) {
      loading = undefined;
    } else if (preload) {
      loading = 'eager';
    }

    const imgAttrs = {
      src: imageUrl,
      width,
      height,
      srcset,
      alt,
      loading,
      ...attrs,
    };

    return `<img ${Object.entries(imgAttrs)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([key, value]) => `${key}="${value}"`)
      .join(' ')} />`;
  };
}

function getSizeFromUrlQuery(imageUrl: string, param: string) {
  const match = imageUrl.match(new RegExp(`${param}=(\\d+)`));
  if (match) {
    return parseInt(match[1]) / 2; // divide by 2 for retina
  }
  return null;
}

function generateSmartWidths(width: number) {
  // TODO: see if this actually makes sense
  const widths = [];
  let currentWidth = width;
  while (currentWidth > 256) {
    currentWidth = Math.round(currentWidth * 0.8);
    widths.push(currentWidth);
  }
  return widths;
}

function generateSmartSrcset(imageUrl: string, widths: number[]) {
  return widths
    ?.map((w) => {
      let url = imageUrl;
      if (url.includes('?')) {
        url = url.replace(/width=\d+/, `width=${w}`);
        url = url.replace(/height=\d+/, '');
      } else {
        url = `${url}?width=${w}`;
      }
      return `${url} ${w}w`;
    })
    .join(', ');
}
