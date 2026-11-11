import { afterEach, expect, it, vi } from "vitest";
import { AttemptDeadline } from "../apps/web/src/net/attemptDeadline";
afterEach(()=>vi.useRealTimers());
it("expires an otherwise silent connection attempt",()=>{vi.useFakeTimers();const d=new AttemptDeadline(),fail=vi.fn();d.arm(15000,fail);vi.advanceTimersByTime(14999);expect(fail).not.toHaveBeenCalled();vi.advanceTimersByTime(1);expect(fail).toHaveBeenCalledOnce();});
it("replaces the connection deadline for the session handshake",()=>{vi.useFakeTimers();const d=new AttemptDeadline(),old=vi.fn(),next=vi.fn();d.arm(15000,old);vi.advanceTimersByTime(10000);d.arm(15000,next);vi.advanceTimersByTime(5000);expect(old).not.toHaveBeenCalled();vi.advanceTimersByTime(10000);expect(next).toHaveBeenCalledOnce();});
it("cancels deadlines on a successful join or leaving the screen",()=>{vi.useFakeTimers();const d=new AttemptDeadline(),fail=vi.fn();d.arm(15000,fail);d.clear();vi.advanceTimersByTime(60000);expect(fail).not.toHaveBeenCalled();});
