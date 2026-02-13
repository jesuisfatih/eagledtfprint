import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class CollectFingerprintDto {
  @IsString()
  shop: string;

  @IsString()
  fingerprintHash: string;

  @IsOptional() @IsString() canvasHash?: string;
  @IsOptional() @IsString() webglHash?: string;
  @IsOptional() @IsString() audioHash?: string;

  @IsOptional() @IsString() userAgent?: string;
  @IsOptional() @IsString() platform?: string;
  @IsOptional() @IsString() language?: string;
  @IsOptional() @IsString() languages?: string;
  @IsOptional() @IsString() timezone?: string;
  @IsOptional() @IsNumber() timezoneOffset?: number;

  @IsOptional() @IsNumber() screenWidth?: number;
  @IsOptional() @IsNumber() screenHeight?: number;
  @IsOptional() @IsNumber() colorDepth?: number;
  @IsOptional() @IsNumber() pixelRatio?: number;
  @IsOptional() @IsBoolean() touchSupport?: boolean;

  @IsOptional() @IsNumber() hardwareConcurrency?: number;
  @IsOptional() @IsNumber() deviceMemory?: number;
  @IsOptional() @IsNumber() maxTouchPoints?: number;
  @IsOptional() @IsString() gpuVendor?: string;
  @IsOptional() @IsString() gpuRenderer?: string;

  @IsOptional() @IsBoolean() cookiesEnabled?: boolean;
  @IsOptional() @IsString() doNotTrack?: string;
  @IsOptional() @IsBoolean() adBlockDetected?: boolean;
  @IsOptional() @IsNumber() pluginCount?: number;
  @IsOptional() @IsNumber() fontCount?: number;

  @IsOptional() @IsString() connectionType?: string;

  // Identity signals (sent when available)
  @IsOptional() @IsString() sessionId?: string;
  @IsOptional() @IsString() eagleToken?: string;
  @IsOptional() @IsString() shopifyCustomerId?: string;
  @IsOptional() @IsString() email?: string;

  @IsOptional() @IsNumber() signalCount?: number;

  // ThumbmarkJS cross-session fingerprint hash
  @IsOptional() @IsString() thumbmarkHash?: string;

  // Traffic source (sent as nested object from snippet)
  @IsOptional() trafficSource?: any;
}
