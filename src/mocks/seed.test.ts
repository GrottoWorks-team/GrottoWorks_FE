import { describe, expect, it } from 'vitest';
import { seed } from './seed';
import { shortage } from '../types';

describe('seed invariants', () => {
  const areaIds = new Set(seed.areas.map((a) => a.id));
  const userIds = new Set(seed.users.map((u) => u.id));

  it('mọi task.areaId thuộc danh sách areas', () => {
    seed.tasks.forEach((t) => expect(areaIds.has(t.areaId)).toBe(true));
  });

  it('mọi material.areaId thuộc danh sách areas', () => {
    seed.materials.forEach((m) => expect(areaIds.has(m.areaId)).toBe(true));
  });

  it('4 tài khoản demo tồn tại với 4 role khác nhau', () => {
    const demo = seed.users.filter((u) =>
      ['admin', 'committee', 'leader', 'officer'].some((k) => u.email.startsWith(k)),
    );
    expect(demo).toHaveLength(4);
    expect(new Set(demo.map((u) => u.role)).size).toBe(4);
  });

  it('mọi area.leaderId/material-officerId tồn tại trong users', () => {
    seed.areas.forEach((a) => {
      expect(userIds.has(a.leaderId)).toBe(true);
      expect(userIds.has(a.officerId)).toBe(true);
    });
  });

  it('donations khớp số liệu vật tư (pledged/received)', () => {
    const byId = new Map(seed.materials.map((m) => [m.id, m]));
    const pledged = new Map<string, number>();
    const received = new Map<string, number>();
    seed.donations.forEach((d) => {
      if (!d.materialId || d.status === 'CANCELED') return;
      const mat = byId.get(d.materialId);
      expect(mat).toBeDefined();
      pledged.set(d.materialId, (pledged.get(d.materialId) ?? 0) + (d.promisedQty ?? 0));
      if (d.status === 'RECEIVED_FULL' || d.status === 'RECEIVED_PARTIAL') {
        received.set(d.materialId, (received.get(d.materialId) ?? 0) + (d.receivedQty ?? 0));
      }
    });
    pledged.forEach((sum, id) => expect(byId.get(id)!.donatedPledged).toBeGreaterThanOrEqual(sum));
    received.forEach((sum, id) => expect(byId.get(id)!.donatedReceived).toBeGreaterThanOrEqual(sum));
  });

    it('received = existing + purchased + donatedReceived cho mọi vật tư', () => {
    seed.materials.forEach((m) =>
      expect(m.received).toBe(m.existing + m.purchased + m.donatedReceived),
    );
  });

  it('mọi supportReg trỏ tới yêu cầu hỗ trợ + TNV tồn tại', () => {
    const requestIds = new Set(seed.supportRequests.map((r) => r.id));
    seed.supportRegs.forEach((g) => {
      expect(requestIds.has(g.requestId)).toBe(true);
      expect(userIds.has(g.volunteerId)).toBe(true);
    });
  });

  it('quy mô dữ liệu đúng đề bài', () => {
    expect(seed.users).toHaveLength(30);
    expect(seed.communities).toHaveLength(3);
    expect(seed.tasks).toHaveLength(40);
    expect(seed.materials).toHaveLength(25);
    expect(seed.donations).toHaveLength(15);
    expect(seed.purchaseRequests).toHaveLength(10);
    expect(seed.borrowedItems).toHaveLength(12);
    expect(seed.supportRequests).toHaveLength(6);
    expect(seed.activityLogs).toHaveLength(40);
    expect(seed.timesheets.length).toBeGreaterThanOrEqual(58);
    expect(seed.checklists).toHaveLength(25);
  });
});

describe('shortage', () => {
  it('tính đúng phần thiếu', () => {
    expect(shortage({ required: 60, received: 30 } as never)).toBe(30);
    expect(shortage({ required: 40, received: 40 } as never)).toBe(0);
    expect(shortage({ required: 10, received: 25 } as never)).toBe(-15);
  });
});
