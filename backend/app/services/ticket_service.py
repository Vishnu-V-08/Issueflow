from typing import List, Optional, Tuple
from sqlalchemy import or_, desc
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.ticket import Ticket, TicketStatus, TicketPriority, TicketCategory
from app.models.ticket_history import TicketHistory
from app.models.user import User, UserRole
from app.schemas.ticket import TicketCreate, TicketUpdate


class TicketService:
    @staticmethod
    def generate_ticket_number(db: Session) -> str:
        """
        Generates the next sequential ticket number like ISS-1001, ISS-1002, etc.
        """
        last_ticket = db.query(Ticket).order_by(Ticket.id.desc()).first()
        if not last_ticket:
            return "ISS-1001"
        next_num = 1000 + last_ticket.id + 1
        return f"ISS-{next_num}"

    @staticmethod
    def get_by_id(db: Session, ticket_id: int) -> Optional[Ticket]:
        return db.query(Ticket).filter(Ticket.id == ticket_id).first()

    @staticmethod
    def get_all(
        db: Session,
        skip: int = 0,
        limit: int = 50,
        search: Optional[str] = None,
        status_filter: Optional[TicketStatus] = None,
        priority_filter: Optional[TicketPriority] = None,
        category_filter: Optional[TicketCategory] = None,
        assigned_to: Optional[int] = None,
    ) -> Tuple[List[Ticket], int]:
        query = db.query(Ticket)

        if search:
            search_term = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    Ticket.title.ilike(search_term),
                    Ticket.description.ilike(search_term),
                    Ticket.ticket_number.ilike(search_term),
                )
            )

        if status_filter:
            query = query.filter(Ticket.status == status_filter)

        if priority_filter:
            query = query.filter(Ticket.priority == priority_filter)

        if category_filter:
            query = query.filter(Ticket.category == category_filter)

        if assigned_to is not None:
            query = query.filter(Ticket.assigned_to == assigned_to)

        total = query.count()
        tickets = query.order_by(desc(Ticket.created_at)).offset(skip).limit(limit).all()
        return tickets, total

    @staticmethod
    def create(db: Session, ticket_in: TicketCreate) -> Ticket:
        # Validate that creator exists
        creator = db.query(User).filter(User.id == ticket_in.created_by).first()
        if not creator:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Creator with user ID {ticket_in.created_by} does not exist."
            )

        # Validate assignee if provided
        if ticket_in.assigned_to:
            assignee = db.query(User).filter(User.id == ticket_in.assigned_to).first()
            if not assignee:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Assigned agent with user ID {ticket_in.assigned_to} does not exist."
                )

        ticket_number = TicketService.generate_ticket_number(db)

        db_ticket = Ticket(
            ticket_number=ticket_number,
            title=ticket_in.title.strip(),
            description=ticket_in.description.strip(),
            category=ticket_in.category,
            priority=ticket_in.priority,
            status=TicketStatus.OPEN,
            created_by=ticket_in.created_by,
            assigned_to=ticket_in.assigned_to,
        )
        db.add(db_ticket)
        db.commit()
        db.refresh(db_ticket)

        # Add initial audit history record
        initial_history = TicketHistory(
            ticket_id=db_ticket.id,
            changed_by=ticket_in.created_by,
            old_status=None,
            new_status=TicketStatus.OPEN.value,
        )
        db.add(initial_history)
        db.commit()
        db.refresh(db_ticket)

        return db_ticket

    @staticmethod
    def update(db: Session, ticket_id: int, ticket_in: TicketUpdate) -> Ticket:
        db_ticket = TicketService.get_by_id(db, ticket_id)
        if not db_ticket:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Ticket with ID {ticket_id} not found."
            )

        update_data = ticket_in.model_dump(exclude_unset=True)

        # If assignee is being updated, validate
        if "assigned_to" in update_data and update_data["assigned_to"] is not None:
            assignee = db.query(User).filter(User.id == update_data["assigned_to"]).first()
            if not assignee:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Assigned user with ID {update_data['assigned_to']} does not exist."
                )

        # If status is being changed, record audit history
        old_status = db_ticket.status.value
        if "status" in update_data and update_data["status"] and update_data["status"].value != old_status:
            history = TicketHistory(
                ticket_id=db_ticket.id,
                changed_by=None,
                old_status=old_status,
                new_status=update_data["status"].value,
            )
            db.add(history)

        for field, value in update_data.items():
            setattr(db_ticket, field, value)

        db.commit()
        db.refresh(db_ticket)
        return db_ticket

    @staticmethod
    def update_status(db: Session, ticket_id: int, new_status: TicketStatus, changed_by: Optional[int] = None) -> Ticket:
        db_ticket = TicketService.get_by_id(db, ticket_id)
        if not db_ticket:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Ticket with ID {ticket_id} not found."
            )

        if changed_by:
            actor = db.query(User).filter(User.id == changed_by).first()
            if not actor:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"User with ID {changed_by} does not exist."
                )

        old_status = db_ticket.status.value
        if old_status != new_status.value:
            history = TicketHistory(
                ticket_id=db_ticket.id,
                changed_by=changed_by,
                old_status=old_status,
                new_status=new_status.value,
            )
            db.add(history)
            db_ticket.status = new_status
            db.commit()
            db.refresh(db_ticket)

        return db_ticket

    @staticmethod
    def assign_agent(db: Session, ticket_id: int, agent_id: Optional[int]) -> Ticket:
        db_ticket = TicketService.get_by_id(db, ticket_id)
        if not db_ticket:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Ticket with ID {ticket_id} not found."
            )

        if agent_id is not None:
            agent = db.query(User).filter(User.id == agent_id).first()
            if not agent:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Agent with ID {agent_id} does not exist."
                )
            if not agent.is_active:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Cannot assign ticket to inactive user '{agent.full_name}'."
                )

        db_ticket.assigned_to = agent_id
        db.commit()
        db.refresh(db_ticket)
        return db_ticket

    @staticmethod
    def delete(db: Session, ticket_id: int) -> None:
        db_ticket = TicketService.get_by_id(db, ticket_id)
        if not db_ticket:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Ticket with ID {ticket_id} not found."
            )
        db.delete(db_ticket)
        db.commit()

