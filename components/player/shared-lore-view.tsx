"use client";

import { SharedLoreItem } from "@/lib/shared-lore";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SharedLoreViewProps {
  items: SharedLoreItem[];
}

export function SharedLoreView({ items }: SharedLoreViewProps) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic font-accent py-6">
        Your GM hasn&apos;t shared any lore with you yet. When they do, it will appear here.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Card key={item.id}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                {item.level}
              </Badge>
              <CardTitle className="text-lg font-display">{item.name || "Untitled"}</CardTitle>
            </div>
            {item.path && <p className="text-xs text-muted-foreground">{item.path}</p>}
          </CardHeader>
          <CardContent className="space-y-2">
            {item.details.length > 0 && (
              <dl className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1 text-sm">
                {item.details.map((d) => (
                  <div key={d.label} className="contents">
                    <dt className="text-muted-foreground">{d.label}</dt>
                    <dd>{d.value}</dd>
                  </div>
                ))}
              </dl>
            )}
            {item.description && <p className="text-sm whitespace-pre-wrap">{item.description}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
