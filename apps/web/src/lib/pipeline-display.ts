const LOWERCASE_WORDS = new Set(["de", "da", "do", "das", "dos", "e", "em", "a", "o", "para"]);

/** Nomes cadastrados em caixa alta ("PÓS-VENDA") são exibidos com iniciais maiúsculas. */
export function displayPipelineName(name: string): string {
  const hasLetters = /\p{L}/u.test(name);
  if (!hasLetters || name !== name.toLocaleUpperCase("pt-BR")) return name;
  return name
    .toLocaleLowerCase("pt-BR")
    .split(" ")
    .map((word, index) =>
      index > 0 && LOWERCASE_WORDS.has(word)
        ? word
        : word.replace(/^\p{L}/u, (letter) => letter.toLocaleUpperCase("pt-BR")),
    )
    .join(" ");
}
