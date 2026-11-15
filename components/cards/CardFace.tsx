import Link from "next/link";
import { cardGroup } from "@/lib/hero/cards";
import type { Card } from "@/lib/hero/types";

/** A card's text: each line is "Name: what it does", with the name picked out */
function Lines({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").filter(Boolean).map((line, i) => {
        const m = line.match(/^([^:]{2,60}):\s+(.*)$/s);
        return (
          <p key={i}>
            {m ? <><strong>{m[1]}.</strong> {m[2]}</> : line}
          </p>
        );
      })}
    </>
  );
}

export function CardFace({ card, href, headingLevel = 2 }: { card: Card; href?: string; headingLevel?: 2 | 1 }) {
  const H = `h${headingLevel}` as "h1" | "h2";
  return (
    <article className="card">
      <header className="card-head">
        <span className="card-tier">Tier {card.tier}</span>
        <span className="card-group">{cardGroup(card)}</span>
      </header>
      <H className="card-name">{href ? <Link href={href}>{card.name}</Link> : card.name}</H>
      <div className="card-body"><Lines text={card.content} /></div>
      <dl className="card-meta">
        {card.willpowerCostText && <div><dt>Willpower</dt><dd>{card.willpowerCostText}</dd></div>}
        <div><dt>Action roll</dt><dd>{card.actionRoll}</dd></div>
        {card.prerequisiteText && <div><dt>Needs</dt><dd>{card.prerequisiteText}</dd></div>}
      </dl>
    </article>
  );
}
