# System Flow Diagrams - Amazon Collaborative Wishlist

This document provides comprehensive flow diagrams for the Amazon Collaborative Wishlist system, showing how data flows through the microservices architecture.

## 🏗️ System Architecture Flow

```mermaid
graph TB
    subgraph "Client Layer"
        FE[Web Frontend<br/>React/Vite<br/>Port 5173]
    end
    
    subgraph "API Layer"
        AG[API Gateway<br/>Express.js<br/>Port 8080]
    end
    
    subgraph "Service Layer"
        WS[Wishlist Service<br/>Express.js<br/>Port 3002]
        MS[Mock Services<br/>Express.js<br/>Port 3004]
    end
    
    subgraph "Data Layer"
        DB[(PostgreSQL<br/>Port 5432<br/>wishlistdb)]
    end
    
    subgraph "External Services (Simulated)"
        US[User Service<br/>Authentication<br/>Profiles]
        PS[Product Service<br/>Catalog<br/>Search]
    end
    
    %% Connections
    FE <--> AG
    AG <--> WS
    AG <--> MS
    WS <--> DB
    MS -.-> US
    MS -.-> PS
    WS -.-> US
    WS -.-> PS
    
    %% Styling
    classDef client fill:#e1f5fe
    classDef api fill:#f3e5f5
    classDef service fill:#e8f5e8
    classDef data fill:#fff3e0
    classDef external fill:#fce4ec
    
    class FE client
    class AG api
    class WS,MS service
    class DB data
    class US,PS external
```

## 🔐 Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant AG as API Gateway
    participant MS as Mock Services
    participant WS as Wishlist Service
    
    Note over U,WS: User Login Flow
    
    U->>FE: Enter username
    FE->>AG: POST /auth/login<br/>{user: "alice"}
    AG->>MS: POST /auth/login<br/>{user: "alice"}
    
    MS->>MS: Validate user
    MS->>MS: Generate JWT token
    MS-->>AG: {accessToken: "jwt_token"}
    AG-->>FE: {accessToken: "jwt_token"}
    FE->>FE: Store token in localStorage
    
    Note over U,WS: Authenticated Request Flow
    
    U->>FE: View wishlists
    FE->>AG: GET /api/wishlists<br/>Authorization: Bearer jwt_token
    AG->>AG: Verify JWT token
    AG->>AG: Extract user_id from token
    AG->>WS: GET /wishlists<br/>x-user-id: 1
    WS->>DB: Query wishlists for user
    DB-->>WS: wishlist data
    WS-->>AG: wishlist data
    AG-->>FE: enriched wishlist data
    FE-->>U: Display wishlists
```

## 📋 Wishlist Operations Flow

### Creating a Wishlist

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant AG as API Gateway
    participant WS as Wishlist Service
    participant DB as Database
    
    U->>FE: Create new wishlist
    FE->>AG: POST /api/wishlists<br/>{name: "Birthday List", description: "..."}
    AG->>AG: Verify JWT & extract user_id
    AG->>WS: POST /wishlists<br/>x-user-id: 1<br/>{name: "Birthday List", description: "..."}
    
    WS->>DB: INSERT INTO wishlist<br/>(name, description, owner_id)
    DB-->>WS: {id: 1, name: "Birthday List", ...}
    WS-->>AG: wishlist data
    AG-->>FE: wishlist data
    FE-->>U: Show new wishlist
```

### Adding Items to Wishlist

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant AG as API Gateway
    participant WS as Wishlist Service
    participant PS as Product Service
    participant DB as Database
    
    U->>FE: Add item to wishlist
    FE->>AG: POST /api/wishlists/1/items<br/>{product_id: 1, title: "Sony Headphones", priority: 1}
    AG->>AG: Verify JWT & extract user_id
    AG->>WS: POST /wishlists/1/items<br/>x-user-id: 1<br/>{product_id: 1, title: "Sony Headphones", priority: 1}
    
    WS->>WS: Validate user has edit permission
    WS->>PS: GET /products/1
    PS-->>WS: product details
    WS->>DB: INSERT INTO wishlist_item<br/>(wishlist_id, product_id, title, priority, added_by)
    DB-->>WS: {id: 1, wishlist_id: 1, product_id: 1, ...}
    WS-->>AG: item data
    AG-->>FE: item data
    FE-->>U: Show item added to wishlist
```

### Viewing Wishlist with Items

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant AG as API Gateway
    participant WS as Wishlist Service
    participant PS as Product Service
    participant US as User Service
    participant DB as Database
    
    U->>FE: View wishlist
    FE->>AG: GET /api/wishlists/1
    AG->>AG: Verify JWT & extract user_id
    AG->>WS: GET /wishlists/1<br/>x-user-id: 1
    
    WS->>DB: SELECT * FROM wishlist WHERE id = 1
    DB-->>WS: wishlist data
    WS->>DB: SELECT * FROM wishlist_item WHERE wishlist_id = 1
    DB-->>WS: items data
    WS->>DB: SELECT * FROM wishlist_access WHERE wishlist_id = 1
    DB-->>WS: access data
    
    loop For each item
        WS->>PS: GET /products/{product_id}
        PS-->>WS: product details
    end
    
    loop For each user_id
        WS->>US: GET /users/{user_id}
        US-->>WS: user details
    end
    
    WS->>WS: Enrich data with external service responses
    WS-->>AG: enriched wishlist data
    AG-->>FE: enriched wishlist data
    FE-->>U: Display wishlist with items and collaborators
```

## 🤝 Collaboration Flow

### Creating an Invitation

```mermaid
sequenceDiagram
    participant U as User (Owner)
    participant FE as Frontend
    participant AG as API Gateway
    participant WS as Wishlist Service
    participant DB as Database
    
    U->>FE: Generate invite link
    FE->>AG: POST /api/wishlists/1/invites<br/>{access_type: "view_only"}
    AG->>AG: Verify JWT & extract user_id
    AG->>WS: POST /wishlists/1/invites<br/>x-user-id: 1<br/>{access_type: "view_only"}
    
    WS->>WS: Validate user is owner
    WS->>WS: Generate unique token
    WS->>DB: INSERT INTO wishlist_invite<br/>(wishlist_id, token, access_type, created_by, expires_at)
    DB-->>WS: {id: 1, token: "abc123", ...}
    WS-->>AG: {token: "abc123", expires_at: "..."}
    AG->>AG: Generate invite link
    AG-->>FE: {token: "abc123", inviteLink: "http://localhost:5173/wishlist/friends/invite/abc123"}
    FE-->>U: Show invite link
```

### Accepting an Invitation

```mermaid
sequenceDiagram
    participant U as User (Invitee)
    participant FE as Frontend
    participant AG as API Gateway
    participant WS as Wishlist Service
    participant US as User Service
    participant DB as Database
    
    U->>FE: Click invite link
    FE->>AG: GET /api/invites/abc123
    AG->>WS: GET /invites/abc123
    WS->>DB: SELECT * FROM wishlist_invite WHERE token = 'abc123'
    DB-->>WS: invite data
    WS->>WS: Validate token not expired
    WS-->>AG: invite details
    AG-->>FE: invite details
    FE-->>U: Show accept invitation UI
    
    U->>FE: Accept invitation
    FE->>AG: POST /api/invites/abc123/accept<br/>{}
    AG->>AG: Verify JWT & extract user_id
    AG->>WS: POST /invites/abc123/accept<br/>x-user-id: 2<br/>{}
    
    WS->>DB: SELECT * FROM wishlist_invite WHERE token = 'abc123'
    DB-->>WS: invite data
    WS->>WS: Validate token not expired
    WS->>DB: SELECT * FROM wishlist_access WHERE wishlist_id = 1 AND user_id = 2
    DB-->>WS: existing access (empty)
    WS->>US: GET /users/2
    US-->>WS: user details
    WS->>DB: INSERT INTO wishlist_access<br/>(wishlist_id, user_id, role, display_name)
    DB-->>WS: access created
    WS-->>AG: {message: "Invitation accepted successfully"}
    AG-->>FE: success response
    FE-->>U: Show success message
```

### Managing Collaborators

```mermaid
sequenceDiagram
    participant U as User (Owner)
    participant FE as Frontend
    participant AG as API Gateway
    participant WS as Wishlist Service
    participant US as User Service
    participant DB as Database
    
    U->>FE: View collaborators
    FE->>AG: GET /api/wishlists/1/access
    AG->>AG: Verify JWT & extract user_id
    AG->>WS: GET /wishlists/1/access<br/>x-user-id: 1
    
    WS->>WS: Validate user is owner
    WS->>DB: SELECT * FROM wishlist_access WHERE wishlist_id = 1
    DB-->>WS: access data
    
    loop For each collaborator
        WS->>US: GET /users/{user_id}
        US-->>WS: user details
    end
    
    WS->>WS: Enrich access data with user details
    WS-->>AG: enriched access data
    AG-->>FE: collaborators list
    FE-->>U: Display collaborators with remove buttons
    
    U->>FE: Remove collaborator
    FE->>AG: DELETE /api/wishlists/1/access/2
    AG->>AG: Verify JWT & extract user_id
    AG->>WS: DELETE /wishlists/1/access/2<br/>x-user-id: 1
    
    WS->>WS: Validate user is owner
    WS->>DB: DELETE FROM wishlist_access<br/>WHERE wishlist_id = 1 AND user_id = 2
    DB-->>WS: access removed
    WS-->>AG: 204 No Content
    AG-->>FE: success response
    FE-->>U: Update collaborators list
```

## 🔄 Data Enrichment Flow

```mermaid
graph TD
    subgraph "Wishlist Service Data Enrichment"
        A[Raw Database Data] --> B[Extract External IDs]
        B --> C[Batch API Calls]
        C --> D[Enrich with External Data]
        D --> E[Return Enriched Response]
    end
    
    subgraph "External Service Calls"
        C --> F[User Service API]
        C --> G[Product Service API]
        F --> H[User Details]
        G --> I[Product Details]
        H --> D
        I --> D
    end
    
    subgraph "Error Handling"
        F --> J[User Service Down]
        G --> K[Product Service Down]
        J --> L[Fallback: Unknown User]
        K --> M[Fallback: No Product Data]
        L --> D
        M --> D
    end
    
    classDef process fill:#e3f2fd
    classDef external fill:#f3e5f5
    classDef error fill:#ffebee
    
    class A,B,C,D,E process
    class F,G,H,I external
    class J,K,L,M error
```

## 🚨 Error Handling Flow

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant AG as API Gateway
    participant WS as Wishlist Service
    participant MS as Mock Services
    participant DB as Database
    
    Note over FE,DB: Normal Flow
    FE->>AG: GET /api/wishlists/1
    AG->>WS: GET /wishlists/1
    WS->>DB: Query wishlist
    DB-->>WS: Data
    WS-->>AG: Data
    AG-->>FE: Data
    
    Note over FE,DB: External Service Failure
    FE->>AG: GET /api/wishlists/1
    AG->>WS: GET /wishlists/1
    WS->>DB: Query wishlist
    DB-->>WS: Data
    WS->>MS: GET /users/1
    MS-->>WS: 500 Internal Server Error
    WS->>WS: Handle error gracefully
    WS-->>AG: Data with fallback user info
    AG-->>FE: Data with fallback user info
    
    Note over FE,DB: Database Failure
    FE->>AG: GET /api/wishlists/1
    AG->>WS: GET /wishlists/1
    WS->>DB: Query wishlist
    DB-->>WS: Connection Error
    WS-->>AG: 500 Internal Server Error
    AG-->>FE: 500 Internal Server Error
    FE->>FE: Show error message to user
```

## 🔧 Service Communication Patterns

### API Gateway Pattern

```mermaid
graph LR
    subgraph "Client Requests"
        A[Frontend Request]
    end
    
    subgraph "API Gateway"
        B[Authentication]
        C[Routing]
        D[Data Enrichment]
        E[Response Formatting]
    end
    
    subgraph "Backend Services"
        F[Wishlist Service]
        G[Mock Services]
    end
    
    A --> B
    B --> C
    C --> F
    C --> G
    F --> D
    G --> D
    D --> E
    E --> A
    
    classDef client fill:#e1f5fe
    classDef gateway fill:#f3e5f5
    classDef service fill:#e8f5e8
    
    class A client
    class B,C,D,E gateway
    class F,G service
```

### Data Enrichment Pattern

```mermaid
graph TD
    A[Wishlist Service Query] --> B[Get Core Data from DB]
    B --> C[Extract External IDs]
    C --> D[Parallel API Calls]
    D --> E[User Service Call]
    D --> F[Product Service Call]
    E --> G[User Data]
    F --> H[Product Data]
    G --> I[Merge Data]
    H --> I
    I --> J[Return Enriched Response]
    
    %% Error paths
    E --> K[User Service Error]
    F --> L[Product Service Error]
    K --> M[Use Fallback User Data]
    L --> N[Use Fallback Product Data]
    M --> I
    N --> I
    
    classDef process fill:#e3f2fd
    classDef external fill:#f3e5f5
    classDef error fill:#ffebee
    
    class A,B,C,I,J process
    class E,F,G,H external
    class K,L,M,N error
```

## 🎯 Key Flow Patterns

### 1. Authentication Flow
- JWT token validation at API Gateway
- User context passed via headers
- Token refresh handled by frontend

### 2. Data Enrichment Flow
- Core data from wishlist service database
- External data via HTTP API calls
- Graceful degradation on service failures

### 3. Collaboration Flow
- Invitation tokens with expiration
- Role-based access control

### 4. Error Handling Flow
- Graceful degradation for external services
- Meaningful error messages for users
- Comprehensive logging for debugging

These flow diagrams provide a complete understanding of how the Amazon Collaborative Wishlist system operates, from user interactions to data persistence and external service integration.
