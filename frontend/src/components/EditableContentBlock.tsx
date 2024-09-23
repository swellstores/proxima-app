import { SwellTheme } from '@swell/apps-sdk';
import { ReactElement, ReactNode, isValidElement } from 'react';
import React from 'react';
import { InlineEditable } from './InlineEditable';

const wrapInlineEditable = (
  element: ReactNode,
  block: any,
  path: string,
): ReactNode => {
  if (isValidElement(element) && element.props['data-swell-inline-editable']) {
    const fieldID = element.props['data-swell-inline-editable'];
    const type = block.fields?.find((field: any) => field.id === fieldID)?.type;
    return (
      <InlineEditable fieldID={fieldID} path={path} type={type}>
        {element}
      </InlineEditable>
    );
  }

  if (isValidElement(element) && (element.props as any).children) {
    const childrenWithWrapper = React.Children.map(
      (element as ReactElement<any>).props.children,
      (child) => wrapInlineEditable(child, block, path),
    );

    return React.cloneElement(element, {}, childrenWithWrapper);
  }

  return element;
};

export function getEditableBlockComponent(theme: SwellTheme, data: any) {
  return function EditableBlock({ Root, children, __easyblocks }: any) {
    const path = __easyblocks.path;
    const wrappedChildren = React.Children.map(children, (child) =>
      wrapInlineEditable(child, data.block, path),
    );

    return <Root.type {...Root.props}>{wrappedChildren}</Root.type>;
  };
}
