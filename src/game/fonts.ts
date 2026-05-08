export const gameFontName = "Baloo 2";
export const gameFontFamily = `"${gameFontName}", "Trebuchet MS", sans-serif`;

export async function loadGameFonts(): Promise<void> {
  if (!("fonts" in document)) {
    return;
  }

  await Promise.all([
    document.fonts.load(`400 16px "${gameFontName}"`),
    document.fonts.load(`700 20px "${gameFontName}"`),
    document.fonts.load(`800 28px "${gameFontName}"`)
  ]);
}
