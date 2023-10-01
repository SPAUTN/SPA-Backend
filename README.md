# SPA-Backend
To insert data all we need is a request to the endpoint, in the context `/insert` with a body that use the following template:
```json
{
    "table": "table_name",
    "user": "user_name",
    "password": "user_password",
    "frame": {
        "column_name_1": "value_1",
        "column_name_2": "value_2",
        ...
        "column_name_n": "value_n"
    }
}
```