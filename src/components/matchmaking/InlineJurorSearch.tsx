import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Startup, MatchScore } from "@/utils/explainableMatchmakingEngine";

interface InlineJurorSearchProps {
  allStartups: Startup[];
  currentStartupId: string;
  excludeStartupIds: string[];
  onSelect: (startup: Startup) => void;
  calculateScore: (startupId: string) => MatchScore;
}

export function InlineJurorSearch({
  allStartups,
  currentStartupId,
  excludeStartupIds,
  onSelect,
  calculateScore,
}: InlineJurorSearchProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filtered, setFiltered] = useState<Startup[]>([]);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered([]);
      return;
    }

    const available = allStartups.filter(
      s => !excludeStartupIds.includes(s.id) && s.id !== currentStartupId
    );

    const searchLower = search.toLowerCase();
    const matches = available.filter(s =>
      s.name.toLowerCase().includes(searchLower) ||
      s.verticals.some(v => v.toLowerCase().includes(searchLower))
    );

    setFiltered(matches.slice(0, 10));
  }, [search, allStartups, excludeStartupIds, currentStartupId]);

  const handleSelect = (startup: Startup) => {
    onSelect(startup);
    setOpen(false);
    setSearch("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Search className="h-4 w-4 mr-1" />
          Replace
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="start">
        <div className="space-y-3">
          <Input
            placeholder="Search startups..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          
          <ScrollArea className="h-64">
            {filtered.length === 0 && search.trim() && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No matching startups
              </p>
            )}
            
            <div className="space-y-2">
              {filtered.map((startup) => {
                const score = calculateScore(startup.id);
                const scoreColor = 
                  score.total_score >= 7 ? "bg-green-100 text-green-800" :
                  score.total_score >= 5 ? "bg-yellow-100 text-yellow-800" :
                  "bg-red-100 text-red-800";

                return (
                  <button
                    key={startup.id}
                    onClick={() => handleSelect(startup)}
                    className="w-full text-left p-2 hover:bg-accent rounded-lg transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {startup.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {score.reason}
                        </p>
                      </div>
                      <Badge className={scoreColor}>
                        {score.total_score.toFixed(1)}
                      </Badge>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}
