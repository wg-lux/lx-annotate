from modeltranslation.translator import translator, TranslationOptions
from endoreg_db.models import (
    Examination, Finding, FindingClassification, FindingClassificationChoice, FindingIntervention
)

class ExaminationTO(TranslationOptions):
    fields = ('name', 'description')
translator.register(Examination, ExaminationTO)

class FindingTO(TranslationOptions):
    fields = ('name', 'description')
translator.register(Finding, FindingTO)

class FindingClassificationTO(TranslationOptions):
    fields = ('name', 'description')
translator.register(FindingClassification, FindingClassificationTO)

class FindingClassificationChoiceTO(TranslationOptions):
    fields = ('name', 'description')
translator.register(FindingClassificationChoice, FindingClassificationChoiceTO)

class FindingInterventionTO(TranslationOptions):
    fields = ('name', 'description')
translator.register(FindingIntervention, FindingInterventionTO)
