"""
Tests for the voice service module
"""

import pytest
import base64
import tempfile
import os
from unittest.mock import Mock, patch, MagicMock
from voice_service import VoiceService, get_voice_service


class TestVoiceService:
    """Test cases for VoiceService class"""

    def setup_method(self):
        """Set up test fixtures"""
        self.voice_service = VoiceService()

    @patch('voice_service.whisper.load_model')
    def test_voice_service_initialization(self, mock_load_model):
        """Test voice service initializes correctly"""
        mock_model = Mock()
        mock_load_model.return_value = mock_model
        
        service = VoiceService()
        
        assert service.whisper_model == mock_model
        assert service.recognizer is not None
        mock_load_model.assert_called_once_with("base")

    @patch('voice_service.whisper.load_model')
    def test_voice_service_initialization_failure(self, mock_load_model):
        """Test voice service handles initialization failure gracefully"""
        mock_load_model.side_effect = Exception("Model loading failed")
        
        service = VoiceService()
        
        assert service.whisper_model is None

    def test_validate_audio_format_valid(self):
        """Test audio format validation with valid base64 data"""
        # Create valid base64 encoded data
        test_data = b"fake audio data"
        encoded_data = base64.b64encode(test_data).decode('utf-8')
        
        result = self.voice_service.validate_audio_format(encoded_data)
        
        assert result is True

    def test_validate_audio_format_invalid(self):
        """Test audio format validation with invalid data"""
        invalid_data = "not base64 encoded"
        
        result = self.voice_service.validate_audio_format(invalid_data)
        
        assert result is False

    def test_validate_audio_format_empty(self):
        """Test audio format validation with empty data"""
        result = self.voice_service.validate_audio_format("")
        
        assert result is False

    def test_transcribe_audio_no_data(self):
        """Test transcription with no audio data"""
        result = self.voice_service.transcribe_audio("")
        
        assert result['success'] is False
        assert 'No audio data provided' in result['error']
        assert result['method'] == 'error'

    def test_transcribe_audio_invalid_base64(self):
        """Test transcription with invalid base64 data"""
        result = self.voice_service.transcribe_audio("invalid_base64")
        
        assert result['success'] is False
        assert 'Transcription failed' in result['error']
        assert result['method'] == 'error'

    @patch('voice_service.tempfile.NamedTemporaryFile')
    @patch('voice_service.base64.b64decode')
    @patch('voice_service.os.path.exists')
    @patch('voice_service.os.unlink')
    def test_transcribe_audio_with_whisper(self, mock_unlink, mock_exists, 
                                          mock_b64decode, mock_temp_file):
        """Test transcription using Whisper model"""
        # Mock setup
        mock_b64decode.return_value = b"fake audio data"
        mock_temp_file.return_value.__enter__.return_value.name = "temp_audio.wav"
        mock_exists.return_value = True
        
        # Mock Whisper model
        mock_model = Mock()
        mock_model.transcribe.return_value = {
            'text': 'Hello world',
            'language': 'en',
            'segments': [
                {'avg_logprob': -0.5}
            ]
        }
        self.voice_service.whisper_model = mock_model
        
        result = self.voice_service.transcribe_audio("dGVzdA==", language="en")
        
        assert result['success'] is True
        assert result['transcribed_text'] == 'Hello world'
        assert result['method'] == 'whisper'
        assert 'confidence' in result
        mock_model.transcribe.assert_called_once()

    @patch('voice_service.tempfile.NamedTemporaryFile')
    @patch('voice_service.base64.b64decode')
    @patch('voice_service.os.path.exists')
    @patch('voice_service.os.unlink')
    @patch('voice_service.sr.AudioFile')
    def test_transcribe_audio_fallback_to_speech_recognition(self, mock_audio_file, 
                                                           mock_unlink, mock_exists,
                                                           mock_b64decode, mock_temp_file):
        """Test transcription fallback to SpeechRecognition"""
        # Mock setup
        mock_b64decode.return_value = b"fake audio data"
        mock_temp_file.return_value.__enter__.return_value.name = "temp_audio.wav"
        mock_exists.return_value = True
        
        # No Whisper model available
        self.voice_service.whisper_model = None
        
        # Mock audio processing
        with patch('voice_service.AudioSegment.from_file') as mock_audio_segment:
            mock_audio = Mock()
            mock_audio.set_frame_rate.return_value = mock_audio
            mock_audio.set_channels.return_value = mock_audio
            mock_audio_segment.return_value = mock_audio
            
            # Mock speech recognition
            self.voice_service.recognizer.recognize_google = Mock(return_value="Test transcription")
            
            result = self.voice_service.transcribe_audio("dGVzdA==", language="en")
        
        assert result['success'] is True
        assert result['transcribed_text'] == "Test transcription"
        assert result['method'] == 'speech_recognition_google'

    def test_process_voice_command(self):
        """Test voice command processing"""
        with patch.object(self.voice_service, 'transcribe_audio') as mock_transcribe:
            mock_transcribe.return_value = {
                'success': True,
                'transcribed_text': 'What are the fees?',
                'language_detected': 'en',
                'confidence': 0.9,
                'method': 'whisper'
            }
            
            result = self.voice_service.process_voice_command("dGVzdA==", language="en")
            
            assert result['success'] is True
            assert result['processed_text'] == 'What are the fees?'
            assert result['command_type'] == 'chat_message'
            assert result['requires_response'] is True

    def test_process_voice_command_failed_transcription(self):
        """Test voice command processing with failed transcription"""
        with patch.object(self.voice_service, 'transcribe_audio') as mock_transcribe:
            mock_transcribe.return_value = {
                'success': False,
                'error': 'Transcription failed',
                'method': 'error'
            }
            
            result = self.voice_service.process_voice_command("dGVzdA==", language="en")
            
            assert result['success'] is False
            assert 'error' in result

    def test_get_service_info(self):
        """Test service information retrieval"""
        info = self.voice_service.get_service_info()
        
        assert 'whisper_available' in info
        assert 'speech_recognition_available' in info
        assert 'supported_languages' in info
        assert info['supported_languages'] == ['en', 'hi', 'mr', 'mwr']
        assert 'whisper_model_loaded' in info
        assert 'dependencies' in info

    def test_language_mapping_whisper(self):
        """Test language mapping for Whisper"""
        # This tests the internal language mapping logic
        # We'll need to access the method through transcription
        with patch('voice_service.tempfile.NamedTemporaryFile'):
            with patch('voice_service.base64.b64decode', return_value=b"test"):
                with patch('voice_service.os.path.exists', return_value=True):
                    with patch('voice_service.os.unlink'):
                        # Mock Whisper model
                        mock_model = Mock()
                        mock_model.transcribe.return_value = {
                            'text': 'Test text',
                            'language': 'hi',
                            'segments': []
                        }
                        self.voice_service.whisper_model = mock_model
                        
                        # Test Hindi language
                        self.voice_service.transcribe_audio("dGVzdA==", language="hi")
                        
                        # Verify Whisper was called with correct language
                        mock_model.transcribe.assert_called_once()
                        args, kwargs = mock_model.transcribe.call_args
                        assert kwargs.get('language') == 'hindi'

    def test_language_mapping_marwari_fallback(self):
        """Test Marwari language fallback to Hindi"""
        with patch('voice_service.tempfile.NamedTemporaryFile'):
            with patch('voice_service.base64.b64decode', return_value=b"test"):
                with patch('voice_service.os.path.exists', return_value=True):
                    with patch('voice_service.os.unlink'):
                        # Mock Whisper model
                        mock_model = Mock()
                        mock_model.transcribe.return_value = {
                            'text': 'Test text',
                            'language': 'hi',  # Should fallback to Hindi
                            'segments': []
                        }
                        self.voice_service.whisper_model = mock_model
                        
                        # Test Marwari language (should use Hindi)
                        self.voice_service.transcribe_audio("dGVzdA==", language="mwr")
                        
                        # Verify Whisper was called with Hindi
                        args, kwargs = mock_model.transcribe.call_args
                        assert kwargs.get('language') == 'hindi'

    @patch('voice_service.which')
    def test_dependency_check_missing_ffmpeg(self, mock_which):
        """Test dependency check when ffmpeg is missing"""
        mock_which.return_value = None
        
        with patch('voice_service.logger') as mock_logger:
            service = VoiceService()
            mock_logger.warning.assert_called_with(
                "ffmpeg not found. Audio conversion may not work properly."
            )

    def test_get_voice_service_singleton(self):
        """Test that get_voice_service returns the global instance"""
        service1 = get_voice_service()
        service2 = get_voice_service()
        
        assert service1 is service2
        assert isinstance(service1, VoiceService)


class TestVoiceServiceError Handling:
    """Test error handling in voice service"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.voice_service = VoiceService()

    @patch('voice_service.tempfile.NamedTemporaryFile')
    @patch('voice_service.base64.b64decode')
    def test_transcribe_audio_file_operation_error(self, mock_b64decode, mock_temp_file):
        """Test handling of file operation errors during transcription"""
        mock_b64decode.return_value = b"fake audio data"
        mock_temp_file.side_effect = IOError("File operation failed")
        
        result = self.voice_service.transcribe_audio("dGVzdA==")
        
        assert result['success'] is False
        assert 'Transcription failed' in result['error']

    def test_transcribe_audio_whisper_error(self):
        """Test handling of Whisper model errors"""
        with patch('voice_service.tempfile.NamedTemporaryFile'):
            with patch('voice_service.base64.b64decode', return_value=b"test"):
                with patch('voice_service.os.path.exists', return_value=True):
                    with patch('voice_service.os.unlink'):
                        # Mock Whisper model that raises exception
                        mock_model = Mock()
                        mock_model.transcribe.side_effect = Exception("Whisper error")
                        self.voice_service.whisper_model = mock_model
                        
                        # Should fall back to speech recognition
                        with patch('voice_service.AudioSegment.from_file'):
                            with patch.object(self.voice_service, '_transcribe_with_speech_recognition') as mock_fallback:
                                mock_fallback.return_value = {'success': True, 'method': 'fallback'}
                                
                                result = self.voice_service.transcribe_audio("dGVzdA==")
                                
                                mock_fallback.assert_called_once()


@pytest.fixture
def sample_audio_data():
    """Fixture providing sample audio data for tests"""
    return base64.b64encode(b"fake audio content").decode('utf-8')


@pytest.fixture
def mock_whisper_result():
    """Fixture providing mock Whisper transcription result"""
    return {
        'text': 'Hello, this is a test transcription',
        'language': 'en',
        'segments': [
            {
                'start': 0.0,
                'end': 2.5,
                'text': 'Hello, this is a test',
                'avg_logprob': -0.3
            },
            {
                'start': 2.5,
                'end': 4.0,
                'text': ' transcription',
                'avg_logprob': -0.2
            }
        ]
    }


def test_voice_service_integration(sample_audio_data, mock_whisper_result):
    """Integration test for voice service with mocked external dependencies"""
    with patch('voice_service.whisper.load_model') as mock_load_model:
        with patch('voice_service.tempfile.NamedTemporaryFile'):
            with patch('voice_service.base64.b64decode', return_value=b"audio_data"):
                with patch('voice_service.os.path.exists', return_value=True):
                    with patch('voice_service.os.unlink'):
                        # Set up mock model
                        mock_model = Mock()
                        mock_model.transcribe.return_value = mock_whisper_result
                        mock_load_model.return_value = mock_model
                        
                        # Test the service
                        service = VoiceService()
                        result = service.transcribe_audio(sample_audio_data, language="en")
                        
                        assert result['success'] is True
                        assert result['transcribed_text'] == 'Hello, this is a test transcription'
                        assert result['method'] == 'whisper'
                        assert result['confidence'] > 0