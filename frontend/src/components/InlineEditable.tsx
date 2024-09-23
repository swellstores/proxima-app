import { useEffect, useRef, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

type InlineEditableProps = {
  fieldID: string;
  children: any;
  path: string;
  type: string;
};

export function InlineEditable(props: InlineEditableProps) {
  const { fieldID, children, path, type } = props;

  const elementRef = useRef(null);
  const [code, setCode] = useState(renderToStaticMarkup(children));

  const changeHandler = (e: any) => {
    postChange(e.target.innerHTML);
  };

  const postChange = (text: any) => {
    window.parent.postMessage(
      {
        type: '@easyblocks-editor/form-change',
        payload: {
          key: path + '.' + fieldID,
          value: {
            type: 'text',
            value: text || ' ',
          },
        },
      },
      '*',
    );
  };

  useEffect(() => {
    setCode(renderToStaticMarkup(children));
  }, [children]);

  return (
    <div
      data-swell-inline-editable={fieldID}
      role="textbox"
      ref={elementRef}
      contentEditable={type === 'rich_text' ? true : 'plaintext-only'}
      onBlur={changeHandler}
      dangerouslySetInnerHTML={{ __html: code }}
    ></div>
  );
}
