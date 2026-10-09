import sys
from datetime import datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .db import Base, SessionLocal, engine
from .models import Meeting, Tag
from .services.ingest import ingest_transcript
from .services.parser import ParsedSegment, finalize, parse_ts

# (timestamp, speaker, text)
MEETINGS = [
    {
        "title": "Q4 Product Roadmap Review", "days_ago": 1, "hour": 10,
        "tags": ["product", "planning"],
        "lines": [
            ("0:08", "Aastha", "Thanks everyone for joining. Today we need to lock the Q4 roadmap and agree on what ships before the December freeze."),
            ("0:45", "Rahul", "The biggest item is the new onboarding flow. Early tests show activation going up about twelve percent, so I think it should be the top priority."),
            ("3:30", "Meera", "I agree, but the analytics dashboard is blocking two enterprise renewals. Can you confirm whether the dashboard can ship in November?"),
            ("5:20", "Rahul", "It's tight. I'll check with the data team and share an estimate by Wednesday."),
            ("8:10", "Karan", "On the infrastructure side we need to migrate the database before the holiday traffic. I'll write the migration plan and circulate it by Friday."),
            ("11:05", "Aastha", "Good. Let's drop the calendar integration from Q4. It's nice to have but it doesn't move activation or renewals."),
            ("13:50", "Priya", "Then I can use that time on mobile polish. Please make sure the design specs for the onboarding screens are final by next week."),
            ("16:40", "Meera", "I'll send the final onboarding specs to Priya by Monday."),
            ("19:25", "Aastha", "Great. I'll publish the roadmap doc tomorrow and follow up with leadership about headcount."),
            ("21:10", "Aastha", "Thanks all, that was a productive session."),
        ],
    },
    {
        "title": "Weekly Engineering Standup", "days_ago": 2, "hour": 9,
        "tags": ["engineering", "standup"],
        "lines": [
            ("0:05", "Karan", "Morning everyone. Quick round of updates, then we'll look at the release blockers."),
            ("0:40", "Dev", "Yesterday I finished the search indexing work. Today I'll add pagination to the results API and open the pull request before lunch."),
            ("2:15", "Sneha", "I'm still blocked on the staging environment. The deploy keeps failing because of a missing environment variable."),
            ("3:00", "Karan", "Can you check the secrets config on staging today? I think the new variable never got added."),
            ("3:30", "Sneha", "Yes, I'll fix the staging config right after this call and ping the channel once deploys are green."),
            ("5:10", "Rahul", "The mobile crash reports went up after the last release. We need to investigate the image upload path before Thursday."),
            ("6:20", "Dev", "I can take that. I'll reproduce the crash on an older Android device and share findings by tomorrow."),
            ("8:00", "Karan", "Also a reminder that the on-call rotation changes next week. Please update your availability in the calendar."),
            ("9:15", "Karan", "Good progress everyone. Let's wrap up and meet again tomorrow."),
        ],
    },
    {
        "title": "Customer Discovery Call - Northwind", "days_ago": 3, "hour": 15,
        "tags": ["sales", "customer"],
        "lines": [
            ("0:10", "Priya", "Thanks for making time today, Arjun. I'd love to understand how your team runs meetings and follow-ups right now."),
            ("1:05", "Arjun", "Right now everything is manual. Someone takes notes, and half the action items never get tracked after the call."),
            ("3:30", "Priya", "That's a common problem. How many meetings does your team have per week?"),
            ("4:20", "Arjun", "Around sixty across sales and customer success. We use Zoom and Google Meet mostly."),
            ("7:45", "Priya", "Great, we can handle both. Transcripts can be uploaded today and summaries are generated automatically."),
            ("10:30", "Arjun", "Security is a big concern for us. We need to see your data retention policy and SOC 2 report before we can move forward."),
            ("12:00", "Priya", "Understood. I'll send the security documentation and the SOC 2 report by tomorrow."),
            ("14:40", "Arjun", "Pricing is the other question. Can you share a quote for fifty seats?"),
            ("15:30", "Priya", "Absolutely. I'll prepare a quote for fifty seats and send it by Friday. Let's schedule a follow-up demo for next week."),
            ("17:00", "Arjun", "Sounds good. Please include the CRM sync details in the follow-up as well."),
            ("18:20", "Priya", "Will do. Thanks again, Arjun."),
        ],
    },
    {
        "title": "Design Sprint Retrospective", "days_ago": 5, "hour": 14,
        "tags": ["design", "retro"],
        "lines": [
            ("0:12", "Meera", "Let's start the retro. What went well during the sprint, what didn't, and what should we change?"),
            ("1:30", "Priya", "The prototype testing went really well. Five out of six users completed the checkout without help."),
            ("3:40", "Sneha", "What didn't work was the handoff. Specs changed twice after development had started, and we lost two days."),
            ("5:15", "Meera", "That's fair. We need to freeze the specs before the sprint begins and log any changes in one shared document."),
            ("7:00", "Aastha", "I'd like us to add a design review checkpoint midway through the sprint. Can you set that up, Meera?"),
            ("8:10", "Meera", "Sure, I'll add a mid-sprint review to the calendar for every sprint going forward."),
            ("10:25", "Priya", "Another improvement is accessibility. We should run a contrast audit on the new components before release."),
            ("11:40", "Sneha", "I'll run the contrast audit and share the report by Thursday."),
            ("13:05", "Meera", "Great. We'll keep the same format next sprint. Thanks everyone."),
        ],
    },
    {
        "title": "Launch Campaign Kickoff", "days_ago": 7, "hour": 11,
        "tags": ["marketing", "campaign"],
        "lines": [
            ("0:15", "Aastha", "Welcome to the campaign kickoff. The goal is two thousand signups from the product launch over the next six weeks."),
            ("2:10", "Priya", "I suggest splitting the budget between search ads and a webinar series. Webinars brought our best leads last quarter."),
            ("4:30", "Rahul", "The landing page needs to be ready first. I'll have the new landing page live by next Monday."),
            ("6:50", "Sneha", "For content, we need to publish three blog posts and a customer story before launch day."),
            ("8:15", "Aastha", "Can you draft the customer story, Priya? Northwind would be a good candidate."),
            ("9:40", "Priya", "Yes, I'll draft the customer story and send it for review by Wednesday."),
            ("11:20", "Sneha", "I'll book the webinar platform and confirm three speakers by the end of the week."),
            ("13:00", "Aastha", "Let's also make sure tracking links are set up for every channel so we can measure results. Rahul, please confirm that."),
            ("14:10", "Rahul", "Will do, I'll check the tracking links tomorrow."),
            ("15:30", "Aastha", "Great kickoff. We'll check in weekly on Tuesdays."),
        ],
    },
    {
        "title": "Hiring Sync - Backend Engineer", "days_ago": 9, "hour": 16,
        "tags": ["hiring", "engineering"],
        "lines": [
            ("0:10", "Karan", "Let's review the backend engineer candidates. We have four finalists and need to decide who gets an offer."),
            ("2:20", "Rahul", "The first candidate was strong on system design, but weaker on testing practices."),
            ("4:45", "Aastha", "The second candidate impressed me. Great communication and solid experience with FastAPI and PostgreSQL."),
            ("7:30", "Karan", "Agreed. The take-home was clean and well documented. I think she's our top choice."),
            ("9:50", "Rahul", "The compensation range is the open question. We need to confirm the budget with finance before sending an offer."),
            ("11:10", "Aastha", "I'll check the budget with finance and confirm the range by Thursday."),
            ("12:40", "Karan", "And I'll schedule a final culture conversation with the second candidate for early next week."),
            ("14:00", "Rahul", "Please make sure we send rejections to the other two candidates this week. It's a courtesy they deserve."),
            ("15:20", "Aastha", "Good point. I'll send those emails tomorrow."),
        ],
    },
]


def _get_or_create_tag(db: Session, name: str) -> Tag:
    tag = db.scalar(select(Tag).where(Tag.name == name))
    if not tag:
        tag = Tag(name=name)
        db.add(tag)
        db.flush()
    return tag


def seed(db: Session) -> None:
    now = datetime.utcnow()
    for m in MEETINGS:
        segs = finalize([ParsedSegment(sp, parse_ts(ts), -1, tx) for ts, sp, tx in m["lines"]])
        when = (now - timedelta(days=m["days_ago"])).replace(
            hour=m["hour"], minute=0, second=0, microsecond=0)
        meeting = ingest_transcript(
            db, title=m["title"], meeting_date=when, segments=segs, source="seed")
        meeting.tags = [_get_or_create_tag(db, t) for t in m["tags"]]
        db.commit()


def seed_if_empty(db: Session) -> None:
    if db.scalar(select(func.count()).select_from(Meeting)) == 0:
        seed(db)


if __name__ == "__main__":
    if "--reset" in sys.argv:
        Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as session:
        seed_if_empty(session)
    print("Seeded.")