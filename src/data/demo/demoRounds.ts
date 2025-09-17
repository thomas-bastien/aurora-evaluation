export const demoRounds = [
  {
    id: "demo-round-screening",
    name: "screening",
    status: "completed",
    started_at: new Date('2024-01-15T00:00:00Z').toISOString(),
    completed_at: new Date('2024-02-05T23:59:59Z').toISOString(),
    created_at: new Date('2024-01-10T10:00:00Z').toISOString(),
    updated_at: new Date('2024-02-05T23:59:59Z').toISOString()
  },
  {
    id: "demo-round-pitching",
    name: "pitching",
    status: "active",
    started_at: new Date('2024-02-06T00:00:00Z').toISOString(),
    completed_at: null,
    created_at: new Date('2024-02-05T10:00:00Z').toISOString(),
    updated_at: new Date('2024-02-06T00:00:00Z').toISOString()
  }
];

export const demoStartupRoundStatuses = [
  // Screening round statuses for selected startups
  {
    id: "demo-status-1",
    startup_id: "demo-startup-1",
    round_id: "demo-round-screening",
    status: "selected",
    created_at: new Date('2024-01-25T11:30:00Z').toISOString(),
    updated_at: new Date('2024-02-05T10:00:00Z').toISOString()
  },
  {
    id: "demo-status-2",
    startup_id: "demo-startup-2",
    round_id: "demo-round-screening",
    status: "selected",
    created_at: new Date('2024-01-26T15:45:00Z').toISOString(),
    updated_at: new Date('2024-02-05T10:00:00Z').toISOString()
  },
  {
    id: "demo-status-3",
    startup_id: "demo-startup-4",
    round_id: "demo-round-screening", 
    status: "selected",
    created_at: new Date('2024-01-27T10:30:00Z').toISOString(),
    updated_at: new Date('2024-02-05T10:00:00Z').toISOString()
  },
  {
    id: "demo-status-4",
    startup_id: "demo-startup-6",
    round_id: "demo-round-screening",
    status: "selected",
    created_at: new Date('2024-01-28T12:15:00Z').toISOString(),
    updated_at: new Date('2024-02-05T10:00:00Z').toISOString()
  },
  {
    id: "demo-status-5",
    startup_id: "demo-startup-9",
    round_id: "demo-round-screening",
    status: "selected",
    created_at: new Date('2024-01-29T14:20:00Z').toISOString(),
    updated_at: new Date('2024-02-05T10:00:00Z').toISOString()
  },
  {
    id: "demo-status-6",
    startup_id: "demo-startup-13",
    round_id: "demo-round-screening",
    status: "selected",
    created_at: new Date('2024-01-30T16:30:00Z').toISOString(),
    updated_at: new Date('2024-02-05T10:00:00Z').toISOString()
  },
  {
    id: "demo-status-7",
    startup_id: "demo-startup-15",
    round_id: "demo-round-screening",
    status: "selected",
    created_at: new Date('2024-01-31T17:15:00Z').toISOString(),
    updated_at: new Date('2024-02-05T10:00:00Z').toISOString()
  },
  {
    id: "demo-status-8",
    startup_id: "demo-startup-18",
    round_id: "demo-round-screening",
    status: "selected",
    created_at: new Date('2024-02-01T11:45:00Z').toISOString(),
    updated_at: new Date('2024-02-05T10:00:00Z').toISOString()
  },
  {
    id: "demo-status-9",
    startup_id: "demo-startup-10",
    round_id: "demo-round-screening",
    status: "selected",
    created_at: new Date('2024-02-03T15:20:00Z').toISOString(),
    updated_at: new Date('2024-02-05T10:00:00Z').toISOString()
  },
  {
    id: "demo-status-10",
    startup_id: "demo-startup-20",
    round_id: "demo-round-screening",
    status: "selected",
    created_at: new Date('2024-02-02T13:30:00Z').toISOString(),
    updated_at: new Date('2024-02-05T10:00:00Z').toISOString()
  },

  // Rejected startups
  {
    id: "demo-status-11",
    startup_id: "demo-startup-7",
    round_id: "demo-round-screening",
    status: "rejected",
    created_at: new Date('2024-01-20T10:00:00Z').toISOString(),
    updated_at: new Date('2024-02-05T10:00:00Z').toISOString()
  },
  {
    id: "demo-status-12",
    startup_id: "demo-startup-12",
    round_id: "demo-round-screening",
    status: "rejected",
    created_at: new Date('2024-01-20T10:00:00Z').toISOString(),
    updated_at: new Date('2024-02-05T10:00:00Z').toISOString()
  },
  {
    id: "demo-status-13",
    startup_id: "demo-startup-17",
    round_id: "demo-round-screening",
    status: "rejected",
    created_at: new Date('2024-01-20T10:00:00Z').toISOString(),
    updated_at: new Date('2024-02-05T10:00:00Z').toISOString()
  },

  // Pending startups (not yet evaluated)
  {
    id: "demo-status-14",
    startup_id: "demo-startup-3",
    round_id: "demo-round-screening",
    status: "pending",
    created_at: new Date('2024-01-20T10:00:00Z').toISOString(),
    updated_at: new Date('2024-01-20T10:00:00Z').toISOString()
  },
  {
    id: "demo-status-15",
    startup_id: "demo-startup-5",
    round_id: "demo-round-screening",
    status: "pending",
    created_at: new Date('2024-01-20T10:00:00Z').toISOString(),
    updated_at: new Date('2024-01-20T10:00:00Z').toISOString()
  },
  {
    id: "demo-status-16",
    startup_id: "demo-startup-8",
    round_id: "demo-round-screening",
    status: "pending",
    created_at: new Date('2024-01-20T10:00:00Z').toISOString(),
    updated_at: new Date('2024-01-20T10:00:00Z').toISOString()
  },
  {
    id: "demo-status-17",
    startup_id: "demo-startup-11",
    round_id: "demo-round-screening",
    status: "pending",
    created_at: new Date('2024-01-20T10:00:00Z').toISOString(),
    updated_at: new Date('2024-01-20T10:00:00Z').toISOString()
  },
  {
    id: "demo-status-18",
    startup_id: "demo-startup-14",
    round_id: "demo-round-screening",
    status: "pending",
    created_at: new Date('2024-01-20T10:00:00Z').toISOString(),
    updated_at: new Date('2024-01-20T10:00:00Z').toISOString()
  },
  {
    id: "demo-status-19",
    startup_id: "demo-startup-16",
    round_id: "demo-round-screening",
    status: "pending",
    created_at: new Date('2024-01-20T10:00:00Z').toISOString(),
    updated_at: new Date('2024-01-20T10:00:00Z').toISOString()
  },
  {
    id: "demo-status-20",
    startup_id: "demo-startup-19",
    round_id: "demo-round-screening",
    status: "pending",
    created_at: new Date('2024-01-20T10:00:00Z').toISOString(),
    updated_at: new Date('2024-01-20T10:00:00Z').toISOString()
  },

  // Pitching round statuses for selected startups
  {
    id: "demo-pitch-status-1",
    startup_id: "demo-startup-1",
    round_id: "demo-round-pitching",
    status: "completed",
    created_at: new Date('2024-02-06T00:00:00Z').toISOString(),
    updated_at: new Date('2024-02-10T11:00:00Z').toISOString()
  },
  {
    id: "demo-pitch-status-2",
    startup_id: "demo-startup-2",
    round_id: "demo-round-pitching",
    status: "completed",
    created_at: new Date('2024-02-06T00:00:00Z').toISOString(),
    updated_at: new Date('2024-02-11T15:00:00Z').toISOString()
  },
  {
    id: "demo-pitch-status-3",
    startup_id: "demo-startup-4",
    round_id: "demo-round-pitching",
    status: "completed",
    created_at: new Date('2024-02-06T00:00:00Z').toISOString(),
    updated_at: new Date('2024-02-12T10:00:00Z').toISOString()
  },
  {
    id: "demo-pitch-status-4",
    startup_id: "demo-startup-6",
    round_id: "demo-round-pitching",
    status: "assigned",
    created_at: new Date('2024-02-06T00:00:00Z').toISOString(),
    updated_at: new Date('2024-02-06T00:00:00Z').toISOString()
  },
  {
    id: "demo-pitch-status-5",
    startup_id: "demo-startup-9",
    round_id: "demo-round-pitching",
    status: "assigned",
    created_at: new Date('2024-02-06T00:00:00Z').toISOString(),
    updated_at: new Date('2024-02-06T00:00:00Z').toISOString()
  },
  {
    id: "demo-pitch-status-6",
    startup_id: "demo-startup-13",
    round_id: "demo-round-pitching",
    status: "assigned",
    created_at: new Date('2024-02-06T00:00:00Z').toISOString(),
    updated_at: new Date('2024-02-06T00:00:00Z').toISOString()
  },
  {
    id: "demo-pitch-status-7",
    startup_id: "demo-startup-15",
    round_id: "demo-round-pitching",
    status: "assigned",
    created_at: new Date('2024-02-06T00:00:00Z').toISOString(),
    updated_at: new Date('2024-02-06T00:00:00Z').toISOString()
  },
  {
    id: "demo-pitch-status-8",
    startup_id: "demo-startup-18",
    round_id: "demo-round-pitching",
    status: "assigned",
    created_at: new Date('2024-02-06T00:00:00Z').toISOString(),
    updated_at: new Date('2024-02-06T00:00:00Z').toISOString()
  },
  {
    id: "demo-pitch-status-9",
    startup_id: "demo-startup-10",
    round_id: "demo-round-pitching",
    status: "assigned",
    created_at: new Date('2024-02-06T00:00:00Z').toISOString(),
    updated_at: new Date('2024-02-06T00:00:00Z').toISOString()
  },
  {
    id: "demo-pitch-status-10",
    startup_id: "demo-startup-20",
    round_id: "demo-round-pitching",
    status: "assigned",
    created_at: new Date('2024-02-06T00:00:00Z').toISOString(),
    updated_at: new Date('2024-02-06T00:00:00Z').toISOString()
  }
];