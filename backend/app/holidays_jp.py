"""
Japanese Calendar and Holiday Utilities

Provides functions to check if a date is a Japanese public holiday
and to get holiday information.
"""

from datetime import date, datetime, timedelta
from typing import Optional, Dict, List
import holidays as holidays_lib


class JapaneseCalendar:
    """Utility class for Japanese calendar operations"""
    
    def __init__(self):
        """Initialize Japanese holidays library"""
        self.holidays_jp = holidays_lib.Japan()
    
    def is_holiday(self, target_date: date) -> bool:
        """Check if a date is a Japanese public holiday"""
        return target_date in self.holidays_jp
    
    def is_weekend(self, target_date: date) -> bool:
        """Check if a date is Saturday or Sunday"""
        day_of_week = target_date.weekday()
        return day_of_week >= 5  # 5 = Saturday, 6 = Sunday
    
    def is_weekend_or_holiday(self, target_date: date) -> bool:
        """Check if a date is either weekend or public holiday"""
        return self.is_weekend(target_date) or self.is_holiday(target_date)
    
    def get_holiday_name(self, target_date: date) -> Optional[str]:
        """Get the name of the holiday for a given date"""
        if target_date in self.holidays_jp:
            return self.holidays_jp[target_date]
        return None
    
    def get_holidays_in_range(self, start_date: date, end_date: date) -> Dict[date, str]:
        """Get all holidays within a date range"""
        holidays_in_range = {}
        current_date = start_date
        
        while current_date <= end_date:
            if current_date in self.holidays_jp:
                holidays_in_range[current_date] = self.holidays_jp[current_date]
            current_date += timedelta(days=1)
        
        return holidays_in_range
    
    def get_non_working_days_in_range(self, start_date: date, end_date: date) -> Dict[date, str]:
        """Get all non-working days (weekends and holidays) in a date range"""
        non_working = {}
        current_date = start_date
        
        while current_date <= end_date:
            if self.is_weekend(current_date):
                day_name = current_date.strftime('%A')
                non_working[current_date] = day_name
            elif current_date in self.holidays_jp:
                non_working[current_date] = self.holidays_jp[current_date]
            current_date += timedelta(days=1)
        
        return non_working
    
    def get_shifts_required_for_week(self, week_start: date) -> int:
        """
        Get the number of shifts required for a week, considering holidays.
        
        - Default: 5 shifts per week (Mon-Fri)
        - Exception 1: If there's a public holiday in the week, reduce by 1
        - Exception 2: If comp-off is applied, it adds an extra shift to compensate
        
        Returns the minimum shifts required for the week.
        """
        week_end = week_start + timedelta(days=6)  # Full week Mon-Sun
        
        # Count weekday holidays
        weekday_holidays = 0
        current_date = week_start
        
        while current_date <= week_end:
            # Check if it's a weekday (Mon-Fri) and a holiday
            if current_date.weekday() < 5 and self.is_holiday(current_date):
                weekday_holidays += 1
            current_date += timedelta(days=1)
        
        # Base 5 shifts, minus 1 for each weekday holiday
        required_shifts = max(4, 5 - weekday_holidays)
        return required_shifts
    
    def get_week_info(self, week_start: date) -> Dict:
        """Get comprehensive week information for scheduling"""
        week_end = week_start + timedelta(days=6)
        
        week_info = {
            'week_start': week_start,
            'week_end': week_end,
            'days': [],
            'weekend_count': 0,
            'holiday_count': 0,
            'weekday_holiday_count': 0,
            'required_shifts': 5
        }
        
        current_date = week_start
        while current_date <= week_end:
            day_info = {
                'date': current_date,
                'day_name': current_date.strftime('%A'),
                'is_weekend': self.is_weekend(current_date),
                'is_holiday': self.is_holiday(current_date),
                'holiday_name': self.get_holiday_name(current_date),
                'is_non_working': self.is_weekend_or_holiday(current_date)
            }
            
            week_info['days'].append(day_info)
            
            if day_info['is_weekend']:
                week_info['weekend_count'] += 1
            
            if day_info['is_holiday']:
                week_info['holiday_count'] += 1
                if not day_info['is_weekend']:
                    week_info['weekday_holiday_count'] += 1
            
            current_date += timedelta(days=1)
        
        # Calculate required shifts
        week_info['required_shifts'] = max(4, 5 - week_info['weekday_holiday_count'])
        
        return week_info


# Global instance
jp_calendar = JapaneseCalendar()


def is_japanese_holiday(target_date: date) -> bool:
    """Convenience function to check if date is Japanese holiday"""
    return jp_calendar.is_holiday(target_date)


def get_japanese_holiday_name(target_date: date) -> Optional[str]:
    """Convenience function to get Japanese holiday name"""
    return jp_calendar.get_holiday_name(target_date)


def is_weekend_or_holiday_japan(target_date: date) -> bool:
    """Convenience function to check if date is weekend or holiday in Japan"""
    return jp_calendar.is_weekend_or_holiday(target_date)
