import React from "react";
import styles from "../styles/card.module.css";

interface Props {
  number: string;
  name: string;
  expire: string;
  ccv: string;
  flipped: boolean;
  cardType: {
    color: string;
    src: string;
  } | null;
}

export default function CardPreview({
  number,
  name,
  expire,
  ccv,
  flipped,
  cardType
}: Props) {
  return (
    <div className={styles.card} style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}>
      
      {/* FRONT */}
      <div
        className={styles.front}
        style={{ background: cardType?.color || "var(--card-color)" }}
      >
        <div className={styles.type}>
          {cardType?.src && <img src={cardType.src} alt="bank logo" />}
        </div>

        <div className={styles.card_number}>
          {number || "●●●● ●●●● ●●●● ●●●●"}
        </div>

        <div className={styles.date}>
          <div className={styles.date_value}>
            {expire || "MM / YYYY"}
          </div>
        </div>

        <div className={styles.fullname}>
          {name || "FULL NAME"}
        </div>
      </div>

      {/* BACK */}
      <div
        className={styles.back}
        style={{ background: cardType?.color || "var(--card-color)" }}
      >
        <div className={styles.magnetic} />
        <div className={styles.bar} />
        <div className={styles.seccode}>
          {ccv || "●●●"}
        </div>
        <div className={styles.disclaimer}>
          This card is for demo purposes only.
        </div>
      </div>
    </div>
  );
}
