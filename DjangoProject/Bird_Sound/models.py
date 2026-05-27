from django.db import models


class BirdSound(models.Model):
    id = models.AutoField(primary_key=True)
    filename = models.CharField(max_length=255)
    eBird = models.CharField(max_length=100)
    secondary_labels = models.JSONField(default=list, blank=True)
    station = models.CharField(max_length=50, blank=True, null=True)
    recording_mode = models.CharField(max_length=50, blank=True, null=True)
    recording_datetime = models.DateTimeField(blank=True, null=True)
    file_type = models.CharField(max_length=10, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'bird_audio'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['eBird']),
            models.Index(fields=['station']),
            models.Index(fields=['recording_datetime']),
        ]

    def __str__(self):
        return f"{self.filename} ({self.eBird})"

class Bird(models.Model): 
    eBird = models.CharField(max_length=20, primary_key=True)
    common_name = models.CharField(max_length=100)
    scientific_name = models.CharField(max_length=100)
    extra_name = models.CharField(max_length=100, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    sound_description = models.TextField(blank=True, null=True)
    naughty_description = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'bird_naming_map'
        ordering = ['common_name']
        indexes = [
            models.Index(fields=['common_name']),
            models.Index(fields=['scientific_name']),
        ]

    def __str__(self):
        return f"{self.eBird} ({self.common_name})"