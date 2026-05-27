from django.urls import path
from . import views

urlpatterns = [
    path('api/sounds/<int:pk>/', views.BirdSoundById.as_view(), name='bird_sound_by_id'),
    path('api/sounds/bird-label/<str:primary_label>/', views.BirdSoundList.as_view(), name='bird_sound_list_by_bird'),
    path('api/birds/<str:pk>/', views.BirdById.as_view(), name='bird_by_id'),
    path('api/birds/', views.BirdList.as_view(), name='bird_list'),
    path('api/audio/<str:eBird>/<str:filename>/', views.AudioFileView.as_view(), name='audio_file'),
    path('api/image/<str:eBird>/<int:index>/', views.ImageFileView.as_view(), name='image_file'),
    path('api/classify/', views.ClassifyAudioView.as_view(), name='classify_audio'),
    path('api/search-by-description/', views.SearchByDescriptionView.as_view(), name='search_by_description'),
    path('api/healthz/', views.HealthCheckView.as_view(), name='healthz'),
]
