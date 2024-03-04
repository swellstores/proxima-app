export function toBase64(inputString: string): string {
  const utf8Bytes = new TextEncoder().encode(inputString);
  let base64String = "";

  for (let i = 0; i < utf8Bytes.length; i += 3) {
    const chunk = Array.from(utf8Bytes.slice(i, i + 3));
    base64String += btoa(String.fromCharCode(...chunk));
  }

  return base64String;
}
