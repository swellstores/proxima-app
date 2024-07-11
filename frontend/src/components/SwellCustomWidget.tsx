import { InlineTypeWidgetComponentProps } from "@easyblocks/core";
import { Input } from "@easyblocks/design-system";
import { useEffect, useState } from "react";

function SwellCustomWidget(props: InlineTypeWidgetComponentProps<string>) {  
  const [active, setActive] = useState(false);
  const [value, setValue] = useState(props.value);

  useEffect(() => {
    if (!active) {
      setValue(props.value);
    }
  });

  return (
    <h1>custom widget broooo</h1>
  );
}

export { SwellCustomWidget };