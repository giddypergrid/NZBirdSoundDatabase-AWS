from rest_framework import serializers
from .models import BirdSound, Bird


class BirdSoundFilenameSerializer(serializers.ModelSerializer):
    class Meta:
        model = BirdSound
        fields = ['filename']

class BirdSoundSerializer(serializers.ModelSerializer):
    class Meta:
        model = BirdSound
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class BirdSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bird
        fields = '__all__'
        read_only_fields = ['eBird', 'created_at', 'updated_at']

class BirdListFilterSerializer(serializers.Serializer):
    random = serializers.BooleanField(required=False, allow_null=True, default=False)
    #quantity = -1, cancel pagination and dump all
    quantity = serializers.IntegerField(required=False, allow_null=True, default=3)


class BirdSoundFilterSerializer(serializers.Serializer):
    station = serializers.CharField(required=False, allow_null=True, max_length=50)
    recording_mode = serializers.CharField(required=False, allow_null=True, max_length=50)
    start_time = serializers.DateTimeField(required=False, allow_null=True, input_formats=['iso-8601'])
    end_time = serializers.DateTimeField(required=False, allow_null=True, input_formats=['iso-8601'])
    
    def validate(self, data):
        if data.get('start_time') and data.get('end_time'):
            if data['start_time'] > data['end_time']:
                raise serializers.ValidationError("start_time must be before end_time")
        return data


class ClassifyPredictionSerializer(serializers.Serializer):
    eBird = serializers.CharField()
    confidence = serializers.FloatField()

class ClassifyResponseSerializer(serializers.Serializer):
    eBird = serializers.CharField()
    confidence = serializers.FloatField()
    top_predictions = ClassifyPredictionSerializer(many=True)


class SearchByDescriptionQuerySerializer(serializers.Serializer):
    query = serializers.CharField(required=True, max_length=500,
                                  help_text="Free-text description to match against birds.")
    threshold = serializers.FloatField(required=False, default=0.45, min_value=0.0, max_value=1.0,
                                       help_text="Strong-match threshold. Hits above this are flagged strong_match=true.")
    top_k = serializers.IntegerField(required=False, default=4, min_value=1, max_value=50,
                                     help_text="Number of birds to return (always this many if available).")


class SearchByDescriptionHitSerializer(serializers.Serializer):
    eBird = serializers.CharField()
    common_name = serializers.CharField(allow_blank=True)
    scientific_name = serializers.CharField(allow_blank=True)
    score = serializers.FloatField()
    best_field = serializers.CharField(
        help_text="Which chunk produced the top score: name | description | sound_description | naughty_description",
    )
    strong_match = serializers.BooleanField(
        help_text="True if score > threshold. UI can de-emphasise hits where this is false.",
    )


class SearchByDescriptionResponseSerializer(serializers.Serializer):
    query = serializers.CharField()
    threshold = serializers.FloatField()
    count = serializers.IntegerField()
    results = SearchByDescriptionHitSerializer(many=True)