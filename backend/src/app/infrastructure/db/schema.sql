-- =============================================================================
-- i-have-a-plan 后端数据库全量 DDL
-- 版本: 1.0
-- 注意: 本文件作为人工可读参考文档存在。
--       实际建表由 SQLModel.metadata.create_all 执行（infrastructure/db/database.py）。
--       两者需保持同步。
-- =============================================================================

-- 项目与任务上下文 (Project & Task Context)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS project (
    id                  TEXT PRIMARY KEY,
    title               TEXT NOT NULL,
    type                TEXT NOT NULL CHECK(type IN ('READING', 'PLAN')),
    status              TEXT NOT NULL DEFAULT 'INIT'
                            CHECK(status IN ('INIT', 'ACTIVE', 'SUSPENDED', 'ARCHIVED')),
    deadline            TEXT,                       -- ISO 8601 datetime
    assigned_agent_id   TEXT,
    created_at          TEXT NOT NULL,
    updated_at          TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_project_title ON project(title);

CREATE TABLE IF NOT EXISTS task (
    id                      TEXT PRIMARY KEY,
    project_id              TEXT NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    title                   TEXT NOT NULL,
    status                  TEXT NOT NULL DEFAULT 'PENDING'
                                CHECK(status IN ('PENDING', 'RUNNING', 'COMPLETED', 'BLOCKED')),
    parent_task_id          TEXT REFERENCES task(id),
    deadline                TEXT,                   -- ISO 8601 datetime
    depends_on_task_ids_json TEXT NOT NULL DEFAULT '[]'  -- JSON 数组字符串
);

CREATE INDEX IF NOT EXISTS idx_task_project_id ON task(project_id);

-- 笔记与知识上下文 (Note & Knowledge Context)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS unified_reading_note (
    id                  TEXT PRIMARY KEY,
    project_id          TEXT NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    content_path        TEXT NOT NULL,              -- 物理 MD 文件绝对路径
    tags_csv            TEXT NOT NULL DEFAULT '',   -- 逗号分隔标签字符串
    source_anchor_json  TEXT NOT NULL DEFAULT '{}', -- JSON: {page, offset, feature}
    created_at          TEXT NOT NULL,
    updated_at          TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_urn_project_id ON unified_reading_note(project_id);

CREATE TABLE IF NOT EXISTS experience_note (
    id                      TEXT PRIMARY KEY,
    project_id              TEXT NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    associated_skill_id     TEXT REFERENCES skill(id) ON DELETE SET NULL,
    content_path            TEXT NOT NULL,          -- 物理 MD 文件绝对路径
    created_at              TEXT NOT NULL
);

-- 技能沙箱上下文 (Skill & Sandbox Context)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS skill (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    sandbox_state   TEXT NOT NULL DEFAULT 'DRAFT'
                        CHECK(sandbox_state IN ('DRAFT', 'SANDBOX', 'ACTIVE')),
    file_path       TEXT NOT NULL,                  -- 物理 YAML/MD 文件路径
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_skill_name ON skill(name);

CREATE TABLE IF NOT EXISTS skill_step (
    id              TEXT PRIMARY KEY,
    skill_id        TEXT NOT NULL REFERENCES skill(id) ON DELETE CASCADE,
    step_id         TEXT NOT NULL,                  -- Skill 内唯一步骤 ID
    title           TEXT NOT NULL,
    depends_on_json TEXT NOT NULL DEFAULT '[]',     -- JSON 步骤 ID 数组
    order_index     INTEGER NOT NULL DEFAULT 0,
    UNIQUE(skill_id, step_id)
);

-- 知识图谱上下文 (Graph & Retrieval Context)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS graph_node (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    source_note_id  TEXT,                           -- 来源笔记 ID（冗余索引）
    is_falsified    INTEGER NOT NULL DEFAULT 0,     -- 0=正常, 1=被证伪降级
    created_at      TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_graph_node_name ON graph_node(name);
CREATE INDEX IF NOT EXISTS idx_graph_node_source ON graph_node(source_note_id);

CREATE TABLE IF NOT EXISTS graph_edge (
    id              TEXT PRIMARY KEY,
    source_id       TEXT NOT NULL REFERENCES graph_node(id) ON DELETE CASCADE,
    target_id       TEXT NOT NULL REFERENCES graph_node(id) ON DELETE CASCADE,
    relation_type   TEXT NOT NULL DEFAULT 'ASSOCIATES'
                        CHECK(relation_type IN ('ASSOCIATES', 'FALSIFIES')),
    created_at      TEXT NOT NULL,
    UNIQUE(source_id, target_id, relation_type)
);

CREATE TABLE IF NOT EXISTS tag_super_node (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    created_at  TEXT NOT NULL
);
