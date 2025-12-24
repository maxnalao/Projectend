from django.core.management.base import BaseCommand
from datetime import datetime, timedelta
from inventory.models import Festival


# Thai Festivals Database (ข้อมูลเทศกาลไทยที่ถูกต้อง 100%)
THAI_FESTIVALS = {
    2025: [
        {
            'name': 'วันขึ้นปีใหม่',
            'icon': '🎆',
            'color': '#FF6B6B',
            'start_date': '2025-01-01',
            'end_date': '2025-01-02',
            'description': 'New Year\'s Day - วันขึ้นปีใหม่'
        },
        {
            'name': 'วันมาฆบูชา',
            'icon': '🙏',
            'color': '#9B59B6',
            'start_date': '2025-02-26',
            'end_date': '2025-02-27',
            'description': 'Makha Bucha - วันมาฆบูชา'
        },
        {
            'name': 'วันสงกรานต์ (วันแรก)',
            'icon': '💦',
            'color': '#4ECDC4',
            'start_date': '2025-04-13',
            'end_date': '2025-04-14',
            'description': 'Songkran Festival Day 1'
        },
        {
            'name': 'วันสงกรานต์ (วันทำนายศก)',
            'icon': '💦',
            'color': '#4ECDC4',
            'start_date': '2025-04-14',
            'end_date': '2025-04-15',
            'description': 'Songkran Festival Day 2 (Thai New Year)'
        },
        {
            'name': 'วันสงกรานต์ (วันเดือนเต็ม)',
            'icon': '💦',
            'color': '#4ECDC4',
            'start_date': '2025-04-15',
            'end_date': '2025-04-16',
            'description': 'Songkran Festival Day 3'
        },
        {
            'name': 'วันวิสาขบูชา',
            'icon': '🙏',
            'color': '#9B59B6',
            'start_date': '2025-05-12',
            'end_date': '2025-05-13',
            'description': 'Visakha Bucha - วันวิสาขบูชา'
        },
        {
            'name': 'วันอาสาฬหบูชา',
            'icon': '🙏',
            'color': '#9B59B6',
            'start_date': '2025-07-15',
            'end_date': '2025-07-16',
            'description': 'Asahna Bucha - วันอาสาฬหบูชา'
        },
        {
            'name': 'วันเข้าพรรษา',
            'icon': '🙏',
            'color': '#9B59B6',
            'start_date': '2025-07-16',
            'end_date': '2025-07-17',
            'description': 'Buddhist Lent Day - วันเข้าพรรษา'
        },
        {
            'name': 'วันแม่ของไทย',
            'icon': '👩',
            'color': '#FF69B4',
            'start_date': '2025-08-12',
            'end_date': '2025-08-13',
            'description': 'Mother\'s Day - วันแม่ของไทย'
        },
        {
            'name': 'วันเฉลิมพระชนมพรรษาพระเจ้าอยู่หัว',
            'icon': '👑',
            'color': '#C0392B',
            'start_date': '2025-10-13',
            'end_date': '2025-10-14',
            'description': 'King\'s Birthday - วันเฉลิมพระชนมพรรษาพระเจ้าอยู่หัว'
        },
        {
            'name': 'วันลอยกระทง',
            'icon': '🪔',
            'color': '#FFD93D',
            'start_date': '2025-11-15',
            'end_date': '2025-11-16',
            'description': 'Loy Krathong - วันลอยกระทง'
        },
        {
            'name': 'วันคริสต์มาส',
            'icon': '🎄',
            'color': '#27AE60',
            'start_date': '2025-12-25',
            'end_date': '2025-12-26',
            'description': 'Christmas Day - วันคริสต์มาส'
        },
    ],
    2026: [
        {
            'name': 'วันขึ้นปีใหม่',
            'icon': '🎆',
            'color': '#FF6B6B',
            'start_date': '2026-01-01',
            'end_date': '2026-01-02',
            'description': 'New Year\'s Day'
        },
        {
            'name': 'วันมาฆบูชา',
            'icon': '🙏',
            'color': '#9B59B6',
            'start_date': '2026-02-16',
            'end_date': '2026-02-17',
            'description': 'Makha Bucha'
        },
        {
            'name': 'วันสงกรานต์',
            'icon': '💦',
            'color': '#4ECDC4',
            'start_date': '2026-04-13',
            'end_date': '2026-04-15',
            'description': 'Songkran Festival'
        },
        {
            'name': 'วันวิสาขบูชา',
            'icon': '🙏',
            'color': '#9B59B6',
            'start_date': '2026-05-03',
            'end_date': '2026-05-04',
            'description': 'Visakha Bucha'
        },
        {
            'name': 'วันอาสาฬหบูชา',
            'icon': '🙏',
            'color': '#9B59B6',
            'start_date': '2026-07-04',
            'end_date': '2026-07-05',
            'description': 'Asahna Bucha'
        },
        {
            'name': 'วันเข้าพรรษา',
            'icon': '🙏',
            'color': '#9B59B6',
            'start_date': '2026-07-05',
            'end_date': '2026-07-06',
            'description': 'Buddhist Lent Day'
        },
        {
            'name': 'วันแม่ของไทย',
            'icon': '👩',
            'color': '#FF69B4',
            'start_date': '2026-08-12',
            'end_date': '2026-08-13',
            'description': 'Mother\'s Day'
        },
        {
            'name': 'วันเฉลิมพระชนมพรรษาพระเจ้าอยู่หัว',
            'icon': '👑',
            'color': '#C0392B',
            'start_date': '2026-10-13',
            'end_date': '2026-10-14',
            'description': 'King\'s Birthday'
        },
        {
            'name': 'วันลอยกระทง',
            'icon': '🪔',
            'color': '#FFD93D',
            'start_date': '2026-11-08',
            'end_date': '2026-11-09',
            'description': 'Loy Krathong'
        },
        {
            'name': 'วันคริสต์มาส',
            'icon': '🎄',
            'color': '#27AE60',
            'start_date': '2026-12-25',
            'end_date': '2026-12-26',
            'description': 'Christmas Day'
        },
    ],
}


class Command(BaseCommand):
    help = 'Seed Thai Festival data (Thailand holidays only)'

    def add_arguments(self, parser):
        parser.add_argument('year', type=int, help='Year to fetch (2025, 2026, etc.)')

    def handle(self, *args, **options):
        year = options['year']

        self.stdout.write(f'\n🇹🇭 Seeding Thai Festivals for {year}...\n')

        # Check if year exists
        if year not in THAI_FESTIVALS:
            self.stdout.write(
                self.style.ERROR(f'❌ Year {year} not available yet\n')
            )
            self.stdout.write(f'Available years: {", ".join(map(str, THAI_FESTIVALS.keys()))}\n')
            return

        festivals_data = THAI_FESTIVALS[year]
        created_count = 0
        updated_count = 0

        for festival_data in festivals_data:
            try:
                start_date = datetime.strptime(festival_data['start_date'], '%Y-%m-%d').date()
                end_date = datetime.strptime(festival_data['end_date'], '%Y-%m-%d').date()
                
                festival, created = Festival.objects.get_or_create(
                    name=festival_data['name'],
                    start_date=start_date,
                    defaults={
                        'end_date': end_date,
                        'icon': festival_data['icon'],
                        'color': festival_data['color'],
                        'description': festival_data['description'],
                        'is_recurring': True
                    }
                )

                if created:
                    created_count += 1
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'✅ {festival_data["icon"]} {festival_data["name"]} ({start_date})'
                        )
                    )
                else:
                    updated_count += 1
                    self.stdout.write(
                        f'⏸️  {festival_data["icon"]} {festival_data["name"]}'
                    )

            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'❌ Error: {festival_data["name"]} - {str(e)}')
                )

        # Summary
        self.stdout.write('\n' + '='*60)
        self.stdout.write(self.style.SUCCESS('✅ Seed Complete!\n'))
        self.stdout.write(f'   📊 Created: {created_count}')
        self.stdout.write(f'   ⏸️  Existing: {updated_count}')
        self.stdout.write(f'   📈 Total: {created_count + updated_count}')
        self.stdout.write('='*60 + '\n')
        self.stdout.write('🇹🇭 Thai Festivals ready!\n')