import cloneDeep from 'lodash/cloneDeep';

class DeferredResource {
  private handler: Function;

  constructor(handler: Function) {
    this.handler = handler;
  }

  resolve() {
    return Promise.resolve(this.handler());
  }
}

export function defer(handler: Function) {
  return new DeferredResource(handler);
}

export class ShopifyResource {
  constructor(props: any) {
    props.toJSON = () => {
      return props;
    };

    props.clone = () => {
      return new ShopifyResource(cloneDeep(props));
    };

    return new Proxy(props, {
      get: (target, prop) => {
        const instance = target as any;
        if (instance[prop] instanceof DeferredResource) {
          return instance[prop].resolve().then((value: any) => {
            instance[prop] = value;
            return value;
          });
        }
        return instance[prop];
      },

      getPrototypeOf() {
        return ShopifyResource.prototype;
      },
    });
  }

  // For typescript
  clone(): ShopifyResource {
    return new ShopifyResource({});
  }
}
