import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MapPin,
  Loader2,
  LocateFixed,
  Map as MapIcon,
  ImageIcon,
  Trash2,
  ArrowRight,
} from "lucide-react";
import { CleanSightMap } from "@/components/maps/CleanSightMap";
import { fmtCoord } from "./constants";
import type { LatLng } from "@/types/map";

interface StepLocationProps {
  location: { lat: number; lng: number } | null;
  onLocationChange: React.Dispatch<
    React.SetStateAction<{ lat: number; lng: number } | null>
  >;
  isLocating: boolean;
  showMapPicker: boolean;
  onToggleMapPicker: (show: boolean) => void;
  locationError: string | null;
  /** Non-null when lat/lng are out of valid range. */
  locationRangeError: string | null;
  onDetectLocation: () => void;
  /* Summary data */
  imageFileName: string | null;
  selectedType: string | null;
  selectedUrgency: string | null;
}

export function StepLocation({
  location,
  onLocationChange,
  isLocating,
  showMapPicker,
  onToggleMapPicker,
  locationError,
  locationRangeError,
  onDetectLocation,
  imageFileName,
  selectedType,
  selectedUrgency,
}: StepLocationProps) {
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");
  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-bold font-display">Confirm Location</h2>
        <span className="text-xs text-muted-foreground">GPS or map pin</span>
      </div>

      {/* Method toggle */}
      <div className="flex gap-1.5">
        <Button
          type="button"
          variant={!showMapPicker ? "default" : "outline"}
          size="sm"
          className="gap-1.5 h-8 text-xs"
          onClick={() => onToggleMapPicker(false)}
        >
          <LocateFixed className="w-3.5 h-3.5" />
          Use GPS
        </Button>
        <Button
          type="button"
          variant={showMapPicker ? "default" : "outline"}
          size="sm"
          className="gap-1.5 h-8 text-xs"
          onClick={() => onToggleMapPicker(true)}
        >
          <MapIcon className="w-3.5 h-3.5" />
          Pick on Map
        </Button>
      </div>

      {showMapPicker ? (
        /* ── Map Picker ── */
        <div className="space-y-2">
          <div className="rounded-lg overflow-hidden border border-border shadow-sm h-[200px]">
            <CleanSightMap
              mode="pick"
              pickedLocation={location as LatLng | undefined}
              onPickLocation={(ll) =>
                onLocationChange({ lat: ll.lat, lng: ll.lng })
              }
              showUserLocation
              className="h-full w-full"
            />
          </div>
          {location ? (
            <div className="flex items-center gap-2 bg-card rounded-lg px-3 py-2 border border-border text-xs">
              <MapPin className="w-4 h-4 text-success flex-shrink-0" />
              <span className="font-mono text-muted-foreground">
                {fmtCoord(location)}
              </span>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center">
              Click the map to place a pin
            </p>
          )}
        </div>
      ) : (
        /* ── GPS / Manual ── */
        <div className="bg-card rounded-lg p-4 border border-border shadow-sm space-y-3">
          {isLocating ? (
            <div className="flex items-center gap-3 justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Detecting location…
              </p>
            </div>
          ) : location ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-success" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-success">
                    Location Detected
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {fmtCoord(location)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-primary h-7 text-xs gap-1"
                  onClick={onDetectLocation}
                >
                  <LocateFixed className="w-3.5 h-3.5" /> Refresh
                </Button>
              </div>
              {locationRangeError && (
                <p className="text-xs text-destructive pl-12">
                  {locationRangeError}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {locationError && (
                <p className="text-xs text-destructive">{locationError}</p>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onDetectLocation}
                className="gap-1.5 h-8 text-xs"
              >
                <LocateFixed className="w-3.5 h-3.5" /> Detect My Location
              </Button>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-0.5">
                  <Label htmlFor="lat" className="text-[11px]">
                    Latitude
                  </Label>
                  <Input
                    id="lat"
                    type="number"
                    step="any"
                    placeholder="e.g. 6.9271"
                    className="font-mono text-xs h-8"
                    value={manualLat}
                    onChange={(e) => {
                      const value = e.target.value;
                      setManualLat(value);
                      const lat = parseFloat(value);
                      const lng = parseFloat(manualLng);
                      if (!isNaN(lat) && !isNaN(lng)) {
                        onLocationChange({ lat, lng });
                      } else {
                        onLocationChange(null);
                      }
                    }}
                  />
                </div>
                <div className="space-y-0.5">
                  <Label htmlFor="lng" className="text-[11px]">
                    Longitude
                  </Label>
                  <Input
                    id="lng"
                    type="number"
                    step="any"
                    placeholder="e.g. 79.8612"
                    className="font-mono text-xs h-8"
                    value={manualLng}
                    onChange={(e) => {
                      const value = e.target.value;
                      setManualLng(value);
                      const lat = parseFloat(manualLat);
                      const lng = parseFloat(value);
                      if (!isNaN(lat) && !isNaN(lng)) {
                        onLocationChange({ lat, lng });
                      } else {
                        onLocationChange(null);
                      }
                    }}
                  />
                </div>
              </div>
              {locationRangeError && (
                <p className="text-xs text-destructive">
                  {locationRangeError}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Report summary (compact) ── */}
      <div className="bg-muted/30 rounded-lg p-3 border border-border/50 space-y-1.5">
        <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          Summary
        </h3>
        <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
          <span className="text-muted-foreground flex items-center gap-1">
            <ImageIcon className="w-3 h-3" /> Photo
          </span>
          <span className="font-medium truncate">{imageFileName || "—"}</span>

          <span className="text-muted-foreground flex items-center gap-1">
            <Trash2 className="w-3 h-3" /> Type
          </span>
          <span className="font-medium capitalize">{selectedType || "—"}</span>

          <span className="text-muted-foreground flex items-center gap-1">
            <ArrowRight className="w-3 h-3" /> Urgency
          </span>
          <span className="font-medium capitalize">
            {selectedUrgency || "—"}
          </span>

          <span className="text-muted-foreground flex items-center gap-1">
            <MapPin className="w-3 h-3" /> Location
          </span>
          <span
            className={`font-medium font-mono ${locationRangeError ? "text-destructive" : ""}`}
          >
            {location ? fmtCoord(location) : "—"}
          </span>
        </div>
      </div>
    </div>
  );
}
