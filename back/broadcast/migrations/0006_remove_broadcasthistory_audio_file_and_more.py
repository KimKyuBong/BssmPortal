# Generated by Django 5.1.6 on 2025-06-28 17:10

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('broadcast', '0005_broadcasthistory_preview_id'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='broadcasthistory',
            name='audio_file',
        ),
        migrations.RemoveField(
            model_name='broadcasthistory',
            name='preview_id',
        ),
        migrations.AddField(
            model_name='broadcasthistory',
            name='preview',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='broadcast.broadcastpreview', verbose_name='프리뷰'),
        ),
    ]
