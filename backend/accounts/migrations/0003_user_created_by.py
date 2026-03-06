from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0002_allow_email_optional'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='created_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='created_users',
                to='accounts.user',
            ),
        ),
    ]

