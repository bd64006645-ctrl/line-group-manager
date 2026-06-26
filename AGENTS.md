# AGENTS.md - LINE 群管理工具

## 项目概览

LINE 群管理工具 - 一个基于 Next.js 16 的全栈管理后台，用于管理 LINE 群组的自动化运营。

### 核心功能
- 社群状态变动监听（入群/退群/改名/撤回通知）
- 高压关键词防御（敏感词检测 → 自动撤回 + 踢人）
- 自定义时段禁言（定时清理机制）
- 多代理与多群独立控制（RBAC 权限隔离）

## 技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI**: shadcn/ui + Tailwind CSS 4
- **Database**: Supabase (PostgreSQL)
- **Auth**: JWT (jose) + bcryptjs

## 目录结构

```
src/
├── app/
│   ├── (dashboard)/          # 管理后台页面（需登录）
│   │   ├── dashboard/        # 仪表盘首页
│   │   ├── groups/           # 群组列表
│   │   ├── groups/[id]/      # 群组详情配置
│   │   ├── admins/           # 管理员管理
│   │   └── events/           # 事件日志
│   ├── api/
│   │   ├── auth/             # 登录/鉴权
│   │   ├── admins/           # 管理员 CRUD
│   │   ├── groups/           # 群组 CRUD + 设置/敏感词/白名单
│   │   ├── events/           # 事件日志查询
│   │   └── webhook/line/     # LINE Webhook 接收
│   ├── page.tsx              # 登录页
│   └── layout.tsx            # 根布局
├── components/
│   ├── ui/                   # shadcn/ui 组件
│   ├── auth-provider.tsx     # 认证上下文
│   └── layout/               # 布局组件
├── lib/
│   ├── auth.ts               # JWT 认证工具
│   ├── line-api.ts           # LINE Messaging API 客户端
│   └── db-types.ts           # 数据库类型定义
└── storage/database/
    ├── supabase-client.ts    # Supabase 客户端
    └── shared/schema.ts      # Drizzle Schema
```

## API 接口清单

| 路径 | 方法 | 说明 |
|------|------|------|
| `/api/auth/login` | POST | 管理员登录 |
| `/api/auth/me` | GET | 获取当前用户信息 |
| `/api/admins` | GET/POST | 管理员列表/创建 |
| `/api/admins/[id]` | PUT/DELETE | 管理员更新/删除 |
| `/api/groups` | GET/POST | 群组列表/创建 |
| `/api/groups/[id]` | PUT/DELETE | 群组更新/删除 |
| `/api/groups/[id]/settings` | GET/PUT | 群组设置 |
| `/api/groups/[id]/sensitive-words` | GET/POST | 敏感词列表/添加 |
| `/api/groups/[id]/sensitive-words/[wordId]` | DELETE | 删除敏感词 |
| `/api/groups/[id]/whitelist` | GET/POST | 白名单列表/添加 |
| `/api/groups/[id]/whitelist/[memberId]` | DELETE | 删除白名单成员 |
| `/api/events` | GET | 事件日志列表 |
| `/api/webhook/line` | POST | LINE Webhook |

## 数据库表

- `admins` - 管理员/代理人
- `line_groups` - LINE 群组
- `group_settings` - 群组独立配置
- `sensitive_words` - 敏感词
- `whitelist_members` - 禁言白名单
- `message_cache` - 消息缓存（撤回留存）
- `member_name_cache` - 成员名字缓存（改名检测）
- `event_logs` - 事件日志

## 开发命令

```bash
pnpm dev          # 启动开发服务器
pnpm build        # 构建生产版本
pnpm start        # 启动生产服务器
pnpm ts-check     # TypeScript 类型检查
pnpm lint         # ESLint 检查
```

## 默认账号

- 用户名: `admin`
- 密码: `admin123`
- 角色: `super_admin`

## 编码规范

- 使用 TypeScript strict 模式
- 禁止隐式 any
- 函数参数必须有类型标注
- 使用 shadcn/ui 组件
- LINE 品牌色: #06C755
