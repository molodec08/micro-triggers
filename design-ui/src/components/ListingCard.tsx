import React from "react";
import { Button } from "./Button";

export interface ListingCardProps {
  name: string;
  tagline: string;
  iconInitial: string;
  price?: string;
}

export function ListingCard({ name, tagline, iconInitial, price }: ListingCardProps) {
  return (
    <div className="s-listing-card">
      <div className="s-listing-card__head">
        <div className="s-icon-tile">{iconInitial}</div>
        <div>
          <p className="s-h3">{name}</p>
          <p className="s-text s-text--secondary s-text--sm">{tagline}</p>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {price ? <span className="s-text s-text--sm">{price}</span> : <span />}
        <Button variant="primary">Install</Button>
      </div>
    </div>
  );
}
