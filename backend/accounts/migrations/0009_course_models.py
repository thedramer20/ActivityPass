from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0008_securitypreference'),
    ]

    operations = [
        migrations.CreateModel(
            name='Course',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('code', models.CharField(blank=True, max_length=64)),
                ('title', models.CharField(max_length=255)),
                ('course_type', models.CharField(blank=True, max_length=64)),
                ('teacher', models.CharField(blank=True, max_length=255)),
                ('location', models.CharField(blank=True, max_length=255)),
                ('term', models.CharField(blank=True, max_length=64)),
                ('first_week_monday', models.DateField(help_text='The Monday date of week 1 for the course term')),
                ('last_week', models.PositiveSmallIntegerField(help_text='Number of the last teaching week (relative to week 1)')),
                ('day_of_week', models.PositiveSmallIntegerField(help_text='1 = Monday, 7 = Sunday')),
                ('start_time', models.TimeField()),
                ('end_time', models.TimeField()),
                ('week_pattern', models.JSONField(blank=True, default=list, help_text='List of week numbers when this course meets')),
                ('source_filename', models.CharField(blank=True, max_length=255)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'ordering': ['term', 'code', 'title'],
            },
        ),
        migrations.CreateModel(
            name='CourseEnrollment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('course', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='enrollments', to='accounts.course')),
                ('student', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='course_enrollments', to='accounts.studentprofile')),
            ],
            options={
                'unique_together': {('course', 'student')},
            },
        ),
    ]
