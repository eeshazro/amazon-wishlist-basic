# Architecture Diagrams - Amazon Collaborative Wishlist

This document provides visual architecture diagrams for the Amazon Collaborative Wishlist system, showing the complete system design and component relationships.

## 🏗️ High-Level System Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        FE[🌐 Web Frontend<br/>React + Vite<br/>Port 5173<br/>Amazon-style UI]
    end
    
    subgraph "API Gateway Layer"
        AG[🚪 API Gateway<br/>Express.js<br/>Port 8080<br/>Authentication & Routing]
    end
    
    subgraph "Service Layer"
        WS[📝 Wishlist Service<br/>Express.js<br/>Port 3002<br/>Your Team's Code]
        MS[🎭 Mock Services<br/>Express.js<br/>Port 3004<br/>Simulates External Teams]
    end
    
    subgraph "Data Layer"
        DB[(🗄️ PostgreSQL<br/>Port 5432<br/>wishlistdb<br/>Your Database)]
    end
    
    subgraph "External Services (Simulated)"
        US[👤 User Service<br/>Identity Team<br/>Authentication & Profiles]
        PS[🛍️ Product Service<br/>Catalog Team<br/>Products & Search]
    end
    
    %% Main connections
    FE <-->|HTTPS/REST| AG
    AG <-->|HTTP/REST| WS
    AG <-->|HTTP/REST| MS
    WS <-->|SQL| DB
    MS -.->|Simulates| US
    MS -.->|Simulates| PS
    WS -.->|HTTP API Calls| US
    WS -.->|HTTP API Calls| PS
    
    %% Styling
    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef api fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef service fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px
    classDef data fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef external fill:#fce4ec,stroke:#880e4f,stroke-width:2px,stroke-dasharray: 5 5
    
    class FE client
    class AG api
    class WS,MS service
    class DB data
    class US,PS external
```

## 🔄 Data Flow Architecture

```mermaid
graph LR
    subgraph "Request Flow"
        A[👤 User Action] --> B[🌐 Frontend]
        B --> C[🚪 API Gateway]
        C --> D[📝 Wishlist Service]
        D --> E[🗄️ Database]
    end
    
    subgraph "Data Enrichment"
        D --> F[🎭 Mock Services]
        F --> G[👤 User Data]
        F --> H[🛍️ Product Data]
        G --> I[📊 Enriched Response]
        H --> I
    end
    
    subgraph "Response Flow"
        I --> C
        C --> B
        B --> A
    end
    
    classDef user fill:#e1f5fe
    classDef frontend fill:#f3e5f5
    classDef backend fill:#e8f5e8
    classDef data fill:#fff3e0
    
    class A user
    class B frontend
    class C,D,F backend
    class E,G,H,I data
```

## 🏢 Service Ownership Model

```mermaid
graph TB
    subgraph "Your Team's Repository"
        WS[📝 Wishlist Service<br/>✅ You Own This]
        DB[(🗄️ Wishlist Database<br/>✅ You Own This)]
        AG[🚪 API Gateway<br/>✅ You Own This]
        FE[🌐 Frontend<br/>✅ You Own This]
    end
    
    subgraph "Other Teams' Services"
        US[👤 User Service<br/>❌ Identity Team Owns]
        PS[🛍️ Product Service<br/>❌ Catalog Team Owns]
    end
    
    subgraph "Development Environment"
        MS[🎭 Mock Services<br/>🔧 Simulates External Teams]
    end
    
    %% Your team connections
    WS <-->|Owns| DB
    AG <-->|Routes to| WS
    FE <-->|Calls| AG
    
    %% External dependencies
    WS -.->|HTTP API Calls| US
    WS -.->|HTTP API Calls| PS
    
    %% Mock services
    MS -.->|Simulates| US
    MS -.->|Simulates| PS
    AG <-->|Calls| MS
    
    classDef owned fill:#c8e6c9,stroke:#2e7d32,stroke-width:3px
    classDef external fill:#ffcdd2,stroke:#c62828,stroke-width:2px,stroke-dasharray: 5 5
    classDef mock fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    
    class WS,DB,AG,FE owned
    class US,PS external
    class MS mock
```

## 🔐 Security & Authentication Flow

```mermaid
sequenceDiagram
    participant U as 👤 User
    participant FE as 🌐 Frontend
    participant AG as 🚪 API Gateway
    participant MS as 🎭 Mock Services
    participant WS as 📝 Wishlist Service
    
    Note over U,WS: Authentication Flow
    
    U->>FE: Enter username
    FE->>AG: POST /auth/login
    AG->>MS: POST /auth/login
    MS->>MS: Validate user
    MS->>MS: Generate JWT
    MS-->>AG: JWT token
    AG-->>FE: JWT token
    FE->>FE: Store token
    
    Note over U,WS: Authenticated Request
    
    U->>FE: View wishlists
    FE->>AG: GET /api/wishlists<br/>Authorization: Bearer token
    AG->>AG: Verify JWT
    AG->>AG: Extract user_id
    AG->>WS: GET /wishlists<br/>x-user-id: 1
    WS->>WS: Process request
    WS-->>AG: Response
    AG-->>FE: Response
    FE-->>U: Display data
```

## 🗄️ Database Architecture

```mermaid
erDiagram
    WISHLIST {
        int id PK
        string name
        string description
        int owner_id FK
        timestamp created_at
    }
    
    WISHLIST_ITEM {
        int id PK
        int wishlist_id FK
        int product_id FK
        string title
        int priority
        int added_by FK
        timestamp created_at
    }
    
    WISHLIST_ACCESS {
        int wishlist_id PK,FK
        int user_id PK,FK
        string role
        string display_name
    }
    
    WISHLIST_INVITE {
        int id PK
        int wishlist_id FK
        string token UK
        string access_type
        timestamp expires_at
        int created_by FK
        timestamp created_at
    }
    
    WISHLIST_COMMENT {
        int id PK
        int wishlist_item_id FK
        int author_id FK
        string content
        timestamp created_at
    }
    
    WISHLIST ||--o{ WISHLIST_ITEM : "contains"
    WISHLIST ||--o{ WISHLIST_ACCESS : "has access"
    WISHLIST ||--o{ WISHLIST_INVITE : "has invites"
    WISHLIST_ITEM ||--o{ WISHLIST_COMMENT : "has comments"
```

## 🔄 Collaboration Flow

```mermaid
graph TD
    subgraph "Invitation Creation"
        A[👤 Owner creates invite] --> B[📝 Generate token]
        B --> C[🗄️ Store in database]
        C --> D[🔗 Create invite link]
    end
    
    subgraph "Invitation Acceptance"
        E[👤 User clicks link] --> F[🔍 Validate token]
        F --> G[✅ Check expiration]
        G --> H[👥 Add to access list]
        H --> I[🎉 Access granted]
    end
    
    subgraph "Collaboration"
        J[👥 View shared wishlist] --> K[📝 Add items (if permitted)]
        K --> L[💬 Comment on items (if permitted)]
    end
    
    D --> E
    I --> J
    
    classDef process fill:#e3f2fd
    classDef database fill:#fff3e0
    classDef user fill:#e1f5fe
    
    class A,E,J user
    class B,D,F,G,H,I,K,L,M process
    class C database
```

## 🚀 Deployment Architecture

```mermaid
graph TB
    subgraph "Docker Environment"
        subgraph "Frontend Container"
            FE[🌐 Web Frontend<br/>React + Vite<br/>Port 5173]
        end
        
        subgraph "Backend Containers"
            AG[🚪 API Gateway<br/>Express.js<br/>Port 8080]
            WS[📝 Wishlist Service<br/>Express.js<br/>Port 3002]
            MS[🎭 Mock Services<br/>Express.js<br/>Port 3004]
        end
        
        subgraph "Database Container"
            DB[(🗄️ PostgreSQL<br/>Port 5432)]
        end
    end
    
    subgraph "External Access"
        USER[👤 Users] --> FE
        DEV[👨‍💻 Developers] --> AG
        DEV --> WS
        DEV --> MS
        DEV --> DB
    end
    
    FE <--> AG
    AG <--> WS
    AG <--> MS
    WS <--> DB
    
    classDef container fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef external fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    
    class FE,AG,WS,MS,DB container
    class USER,DEV external
```

## 🔧 Development Workflow

```mermaid
graph LR
    subgraph "Development Process"
        A[📝 Write Code] --> B[🧪 Test Locally]
        B --> C[🐳 Build Docker Images]
        C --> D[🚀 Deploy with Docker Compose]
        D --> E[🔍 Debug & Monitor]
        E --> F[📊 View Logs]
        F --> A
    end
    
    subgraph "Code Changes"
        G[📝 Wishlist Service] --> H[🔄 Rebuild Container]
        I[🌐 Frontend] --> J[🔄 Rebuild Container]
        K[🚪 API Gateway] --> L[🔄 Rebuild Container]
    end
    
    H --> D
    J --> D
    L --> D
    
    classDef process fill:#e3f2fd
    classDef code fill:#f3e5f5
    
    class A,B,C,D,E,F process
    class G,H,I,J,K,L code
```

## 🎯 Key Architectural Principles

### 1. Service Ownership
- **Wishlist Service**: Owns all wishlist domain data
- **External Services**: User and product data via API calls
- **Clear Boundaries**: No direct database access to external data

### 2. Data Enrichment
- **Core Data**: From wishlist service database
- **External Data**: Via HTTP API calls to other services
- **Graceful Degradation**: Fallback when external services fail

### 3. Authentication & Authorization
- **JWT Tokens**: Stateless authentication
- **API Gateway**: Centralized token validation
- **Role-Based Access**: Granular permissions for collaboration

### 4. Scalability & Performance
- **Microservices**: Independent scaling
- **Database Isolation**: Service-owned data
- **Caching Opportunities**: External service responses

### 5. Development Experience
- **Mock Services**: Simulate external dependencies
- **Docker Compose**: Easy local development
- **Clear Documentation**: Comprehensive guides

This architecture provides a solid foundation for building collaborative wishlist features while maintaining the real Amazon work environment patterns of service ownership and external API dependencies.
