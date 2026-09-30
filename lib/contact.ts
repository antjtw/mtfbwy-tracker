export const GM_EMAIL = "anthony@antjtw.com";

function mailto(subject: string, body: string) {
  return `mailto:${GM_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export const FORGOTTEN_CODE_MAILTO = mailto(
  "I’ve forgotten my MTFBWY RPG player code",
  `Hi Anthony,

I’ve gone and forgotten my MTFBWY RPG player code, which is a bit embarrassing for someone who has survived this many adventures. Could you please send it over when you get a moment?

My name:
The character I’m trying to get to:

May the Force (and the codes) be with you.

Thanks!`,
);

export const MESSAGE_GM_MAILTO = mailto(
  "MTFBWY RPG: a message for the GM",
  `Hi Anthony,

I’m trying to get into the MTFBWY RPG tracker and need a hand.

My name:

Thanks!`,
);
