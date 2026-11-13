from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status, HTTPException
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.models.ticket import TicketStatus, TicketPriority, TicketCategory
from app.models.user import User, UserRole
from app.schemas.ticket import (
    TicketCreate,
    TicketUpdate,
    TicketStatusUpdate,
    TicketAssign,
    TicketResponse,
    TicketListResponse,
)
from app.schemas.comment import CommentCreate, CommentResponse
from app.services.ticket_service import TicketService
from app.services.comment_service import CommentService
from app.api.deps import require_authenticated, require_admin, require_staff

router = APIRouter(prefix="/tickets", tags=["Tickets"])


@router.post(
    "/",
    response_model=TicketResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new support ticket (Authenticated users)"
)
def create_ticket(
    ticket_in: TicketCreate,
    current_user: User = Depends(require_authenticated),
    db: Session = Depends(get_db)
):
    """
    File a new support ticket.
    - If customer: created_by is strictly forced to the customer's own ID, and assigned_to is forced to None.
    - If staff/admin: can file on behalf of customers and assign agents.
    """
    if current_user.role == UserRole.CUSTOMER:
        if ticket_in.assigned_to is not None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Customers are not permitted to assign agents to tickets."
            )
        ticket_in.created_by = current_user.id
        ticket_in.assigned_to = None
    elif not ticket_in.created_by:
        ticket_in.created_by = current_user.id

    return TicketService.create(db=db, ticket_in=ticket_in)


@router.get(
    "/",
    response_model=TicketListResponse,
    summary="List tickets (Scoped by role: Customers see only their own)"
)
def get_tickets(
    skip: int = Query(0, ge=0, description="Offset records to skip"),
    limit: int = Query(20, ge=1, le=100, description="Max tickets to return"),
    search: Optional[str] = Query(None, description="Search keyword in title, description, or ticket ID"),
    status: Optional[TicketStatus] = Query(None, description="Filter by status"),
    priority: Optional[TicketPriority] = Query(None, description="Filter by priority"),
    category: Optional[TicketCategory] = Query(None, description="Filter by category"),
    assigned_to: Optional[int] = Query(None, description="Filter by assigned agent User ID"),
    current_user: User = Depends(require_authenticated),
    db: Session = Depends(get_db)
):
    """
    Retrieve tickets.
    - Customers: strictly restricted to viewing only tickets they created.
    - Agents and Admins: can browse and filter all workspace tickets.
    """
    # Enforce customer isolation
    if current_user.role == UserRole.CUSTOMER:
        # Override query to only fetch tickets created by this customer
        tickets, total = TicketService.get_all(
            db=db,
            skip=skip,
            limit=limit,
            search=search,
            status_filter=status,
            priority_filter=priority,
            category_filter=category,
            assigned_to=None,
        )
        # Filter in-memory or by creator
        user_tickets = [t for t in tickets if t.created_by == current_user.id]
        return TicketListResponse(
            total=len(user_tickets),
            page=1,
            limit=limit,
            items=user_tickets
        )

    tickets, total = TicketService.get_all(
        db=db,
        skip=skip,
        limit=limit,
        search=search,
        status_filter=status,
        priority_filter=priority,
        category_filter=category,
        assigned_to=assigned_to,
    )
    return TicketListResponse(
        total=total,
        page=(skip // limit) + 1 if limit else 1,
        limit=limit,
        items=tickets
    )


@router.get(
    "/{ticket_id}",
    response_model=TicketResponse,
    summary="Get ticket details (Restricted by user role and ownership)"
)
def get_ticket_by_id(
    ticket_id: int,
    current_user: User = Depends(require_authenticated),
    db: Session = Depends(get_db)
):
    """
    Fetch a complete ticket with creator info, comments, and history.
    Customers are strictly prevented from viewing tickets belonging to other customers.
    """
    ticket = TicketService.get_by_id(db=db, ticket_id=ticket_id)
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ticket with ID {ticket_id} not found."
        )

    # Prevent customers from accessing another customer's ticket
    if current_user.role == UserRole.CUSTOMER and ticket.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. You can only access tickets you have created."
        )

    return ticket


@router.put(
    "/{ticket_id}",
    response_model=TicketResponse,
    summary="Update ticket details"
)
def update_ticket(
    ticket_id: int,
    ticket_in: TicketUpdate,
    current_user: User = Depends(require_authenticated),
    db: Session = Depends(get_db)
):
    """
    Update ticket details. Customers can only update title and description on their own tickets.
    """
    ticket = TicketService.get_by_id(db=db, ticket_id=ticket_id)
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ticket with ID {ticket_id} not found."
        )

    if current_user.role == UserRole.CUSTOMER:
        if ticket.created_by != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. You can only edit your own tickets."
            )
        # Prevent customer from changing status or assignment via PUT
        ticket_in.assigned_to = None
        ticket_in.status = None

    return TicketService.update(db=db, ticket_id=ticket_id, ticket_in=ticket_in)


@router.delete(
    "/{ticket_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a ticket (Admin only)"
)
def delete_ticket(
    ticket_id: int,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Administrator endpoint to permanently delete a ticket.
    """
    TicketService.delete(db=db, ticket_id=ticket_id)
    return None


@router.post(
    "/{ticket_id}/assign",
    response_model=TicketResponse,
    summary="Assign ticket to an agent (Staff and Admin only)"
)
def assign_ticket(
    ticket_id: int,
    assignment: TicketAssign,
    current_staff: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """
    Assign a ticket to a support agent. Customers cannot assign tickets.
    """
    return TicketService.assign_agent(
        db=db,
        ticket_id=ticket_id,
        agent_id=assignment.assigned_to
    )


@router.patch(
    "/{ticket_id}/status",
    response_model=TicketResponse,
    summary="Update ticket status"
)
def update_ticket_status(
    ticket_id: int,
    status_update: TicketStatusUpdate,
    current_user: User = Depends(require_authenticated),
    db: Session = Depends(get_db)
):
    """
    Update ticket status and record audit history.
    - Staff / Admins can update any status.
    - Customers can only close/reopen their own tickets.
    """
    ticket = TicketService.get_by_id(db=db, ticket_id=ticket_id)
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ticket with ID {ticket_id} not found."
        )

    if current_user.role == UserRole.CUSTOMER:
        if ticket.created_by != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. You can only update status on your own tickets."
            )
        if status_update.status not in [TicketStatus.CLOSED, TicketStatus.OPEN]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Customers can only change status to OPEN or CLOSED."
            )

    return TicketService.update_status(
        db=db,
        ticket_id=ticket_id,
        new_status=status_update.status,
        changed_by=current_user.id
    )


# -------------------------------------------------------------------------
# Sub-routes for Comments under Tickets
# -------------------------------------------------------------------------

@router.post(
    "/{ticket_id}/comments",
    response_model=CommentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a comment to a ticket"
)
def add_ticket_comment(
    ticket_id: int,
    comment_in: CommentCreate,
    current_user: User = Depends(require_authenticated),
    db: Session = Depends(get_db)
):
    """
    Post a new reply or note onto a ticket.
    - Customers can only comment on their own tickets.
    - user_id is automatically assigned from the authenticated user.
    """
    ticket = TicketService.get_by_id(db=db, ticket_id=ticket_id)
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ticket with ID {ticket_id} not found."
        )

    if current_user.role == UserRole.CUSTOMER and ticket.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. You cannot comment on another customer's ticket."
        )

    comment_in.user_id = current_user.id
    return CommentService.create(
        db=db,
        ticket_id=ticket_id,
        comment_in=comment_in
    )


@router.get(
    "/{ticket_id}/comments",
    response_model=List[CommentResponse],
    summary="Get all comments for a ticket"
)
def get_ticket_comments(
    ticket_id: int,
    current_user: User = Depends(require_authenticated),
    db: Session = Depends(get_db)
):
    """
    Retrieve all comments on a ticket.
    Customers cannot inspect comments on another customer's ticket.
    """
    ticket = TicketService.get_by_id(db=db, ticket_id=ticket_id)
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ticket with ID {ticket_id} not found."
        )

    if current_user.role == UserRole.CUSTOMER and ticket.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. You cannot view comments on another customer's ticket."
        )

    return CommentService.get_by_ticket(db=db, ticket_id=ticket_id)
