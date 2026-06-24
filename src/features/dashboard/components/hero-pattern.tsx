"use client";

import { WavyBackground } from "@/components/ui/wavy-background";
import { useTheme } from "next-themes";

export function HeroPattern() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div className="pointer-events-none absolute inset-0 hidden overflow-hidden lg:block">
      <WavyBackground
        key={isDark ? "dark" : "light"}
        colors={isDark
          ? ["#57D7E0", "#60E0FF", "#8CC7FF", "#B996FF"]
          : ["#2DD4BF", "#22D3EE", "#38BDF8", "#818CF8"]
        }
        backgroundFill={isDark ? "#080B1F" : "hsl(0 0% 100%)"}
        blur={isDark ? 4 : 3}
        speed="slow"
        waveOpacity={isDark ? 0.16 : 0.1}
        waveWidth={60}
        waveYOffset={250}
        containerClassName="h-full"
        className="hidden"
      />
    </div>
  );
}
