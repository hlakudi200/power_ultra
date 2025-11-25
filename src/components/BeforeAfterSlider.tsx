import { useState } from "react";
import { cn } from "@/lib/utils";

interface BeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
  beforeAlt: string;
  afterAlt: string;
}

const BeforeAfterSlider = ({
  beforeImage,
  afterImage,
  beforeAlt,
  afterAlt,
}: BeforeAfterSliderProps) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  const handleMove = (clientX: number, rect: DOMRect) => {
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percentage = Math.max(0, Math.min((x / rect.width) * 100, 100));
    setSliderPosition(percentage);
  };

  const handleMouseDown = () => setIsDragging(true);
  const handleMouseUp = () => setIsDragging(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const rect = e.currentTarget.getBoundingClientRect();
    handleMove(e.clientX, rect);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const rect = e.currentTarget.getBoundingClientRect();
    handleMove(e.touches[0].clientX, rect);
  };

  return (
    <div
      className="relative w-full aspect-[3/4] select-none overflow-hidden rounded-lg cursor-col-resize"
      onMouseMove={handleMouseMove}
      onTouchMove={handleTouchMove}
      onMouseUp={handleMouseUp}
      onTouchEnd={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* After Image (background) */}
      <img
        src={afterImage}
        alt={afterAlt}
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Before Image (clipped) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
      >
        <img
          src={beforeImage}
          alt={beforeAlt}
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>

      {/* Slider */}
      <div
        className="absolute top-0 bottom-0 w-1 cursor-col-resize"
        style={{ left: `${sliderPosition}%` }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleMouseDown}
      >
        <div className="absolute inset-0 bg-foreground shadow-strong" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-foreground rounded-full shadow-strong flex items-center justify-center">
          <div className="flex gap-1">
            <div className="w-0.5 h-6 bg-background" />
            <div className="w-0.5 h-6 bg-background" />
          </div>
        </div>
      </div>

      {/* Labels */}
      <div className="absolute top-4 left-4 bg-background/90 px-3 py-1 rounded-full text-sm font-bold text-foreground">
        BEFORE
      </div>
      <div className="absolute top-4 right-4 bg-primary/90 px-3 py-1 rounded-full text-sm font-bold text-primary-foreground">
        AFTER
      </div>
    </div>
  );
};

export default BeforeAfterSlider;
