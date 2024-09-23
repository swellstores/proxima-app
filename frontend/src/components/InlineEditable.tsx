import { useEffect, useRef, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import FroalaEditor from 'react-froala-wysiwyg';

import 'froala-editor/css/froala_style.min.css';
import 'froala-editor/css/froala_editor.pkgd.min.css';
import 'froala-editor/js/plugins/link.min.js';
import 'froala-editor/js/plugins/paragraph_format.min.js';
import 'froala-editor/js/plugins/lists.min.js';

type InlineEditableProps = {
  fieldID: string;
  children: any;
  path: string;
  type: string;
};

export function InlineEditable(props: InlineEditableProps) {
  const { fieldID, children, path, type } = props;

  const elementRef = useRef(null);
  const spanRef = useRef(null);
  const [code, setCode] = useState(renderToStaticMarkup(children));

  const changeHandler = (text: string) => {
    const textWithoutOuterDiv = text
      .replace(/^<div>/, '')
      .replace(/<\/div>$/, '');
    setCode(text);
    postChange(textWithoutOuterDiv);
  };

  const setRole = () => {
    if (elementRef.current) {
      elementRef.current.editor.el.setAttribute('role', 'textbox');
    }
  };

  const postChange = (text: any) => {
    window.parent.postMessage(
      {
        type: '@easyblocks-editor/form-change',
        payload: {
          key: path + '.' + fieldID,
          value: {
            type: 'text',
            value: text,
          },
        },
      },
      '*',
    );
  };

  useEffect(() => {
    // Still have to optimize the logic so it doesnt loose track of cursor position
    if (
      renderToStaticMarkup(children) !==
      code.replace(/^<div>/, '').replace(/<\/div>$/, '')
    ) {
      setCode(renderToStaticMarkup(children));
    }
  }, [children]);

  return (
    <>
      {/* <span ref={spanRef}>{code}</span> */}
      <FroalaEditor
        tag="div"
        ref={elementRef}
        config={{
          toolbarInline: true,
          toolbarVisibleWithoutSelection: true,
          fontFamilyDefaultSelection: '',
          fontSizeDefaultSelection: '',
          multiline: type === 'rich_text',
          toolbarButtons: [
            'bold',
            'italic',
            'paragraphFormat',
            'formatUL',
            'formatOL',
            'insertLink',
          ],
          htmlUntouched: true,
          events: {
            initialized: setRole,
          },
        }}
        model={code}
        onModelChange={changeHandler}
      />
    </>
  );
}
