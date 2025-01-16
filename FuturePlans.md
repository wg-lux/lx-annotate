# What could come next for the API

Set up spatial information boxes for more complex calculations

```
python
from django.db import models

class Box(models.Model):
    name = models.CharField(max_length=255)
    x = models.IntegerField()
    y = models.IntegerField()
    width = models.IntegerField()
    height = models.IntegerField()
```