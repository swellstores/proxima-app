import { useEffect, useState } from 'react';

function TestMenuWidget(props: any) {
  const [active, setActive] = useState(false);
  const [value, setValue] = useState(props.value);

  useEffect(() => {
    if (!active) {
      setValue(props.value);
    }
  });

  return <div>Menu value: {props.value}</div>;
}

export { TestMenuWidget };
