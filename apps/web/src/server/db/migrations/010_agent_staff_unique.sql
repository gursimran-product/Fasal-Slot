ALTER TABLE agent_staff ADD CONSTRAINT agent_staff_agent_phone_unique UNIQUE (agent_id, phone);
