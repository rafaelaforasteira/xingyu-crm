import { Injectable, ExecutionContext } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";

@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected override async getTracker(req: Record<string, any>): Promise<string> {
    const userId = req.user?.id;
    if (userId) return `user-${userId}`;
    return req.ips?.length ? req.ips[0] : req.ip;
  }
}
