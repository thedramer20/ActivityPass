from django.db import migrations, models


def create_default_security(apps, schema_editor):
    SecurityPreference = apps.get_model('accounts', 'SecurityPreference')
    if not SecurityPreference.objects.exists():
        SecurityPreference.objects.create(
            force_students_change_default=False,
            force_staff_change_default=False,
        )


def delete_security(apps, schema_editor):
    SecurityPreference = apps.get_model('accounts', 'SecurityPreference')
    SecurityPreference.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0007_accountmeta_staff_number'),
    ]

    operations = [
        migrations.CreateModel(
            name='SecurityPreference',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('force_students_change_default', models.BooleanField(default=False)),
                ('force_staff_change_default', models.BooleanField(default=False)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
        ),
        migrations.RunPython(create_default_security, delete_security),
    ]
