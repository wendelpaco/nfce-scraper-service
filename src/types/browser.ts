import { Target } from "puppeteer";

export interface TargetWithCreationTime extends Target {
  _targetInfo?: {
    targetCreationTime?: string;
  };
}
